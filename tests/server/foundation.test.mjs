import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"

const db = new PGlite()
const userA = "00000000-0000-0000-0000-000000000001"
const userB = "00000000-0000-0000-0000-000000000002"
let petA
let assetA

async function asUser(id, action) {
  await db.exec(`set role ${id === null ? "anon" : "authenticated"}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""])
  try {
    return await action()
  } finally {
    await db.exec("reset role")
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant all on storage.objects to anon, authenticated, service_role;
  `)
  await db.exec(
    await readFile(
      new URL("../../supabase/migrations/202610140001_server_foundation.sql", import.meta.url),
      "utf8",
    ),
  )
  await db.query("insert into auth.users values($1, now()), ($2, now())", [userA, userB])
})
after(async () => {
  await db.close()
})

test("verified users provision separate profiles and anonymous callers cannot execute writes", async () => {
  await asUser(userA, () => db.query("select public.ensure_profile()"))
  await asUser(userB, () => db.query("select public.ensure_profile()"))
  await asUser(userA, async () => {
    assert.equal((await db.query("select id from public.profiles")).rows.length, 1)
    await assert.rejects(
      db.query("update public.profiles set account_state='deleting'"),
      /permission denied/,
    )
  })
  await asUser(null, async () => {
    await assert.rejects(db.query("select public.ensure_profile()"), /permission denied/)
    await assert.rejects(db.query("select * from public.profiles"), /permission denied/)
  })
})

test("pet ownership comes from the JWT and direct writes cannot spoof it", async () => {
  await asUser(userA, async () => {
    petA = (await db.query("select (public.create_pet('Mochi','CAT','Mix')).id")).rows[0].id
    assert.equal((await db.query("select owner_id from public.pets")).rows[0].owner_id, userA)
    await assert.rejects(
      db.query(
        "insert into public.pets(owner_id,name,category,breed) values($1,'Spoof','CAT','Mix')",
        [userB],
      ),
      /permission denied/,
    )
  })
  await asUser(userB, async () => {
    assert.equal((await db.query("select * from public.pets where id=$1", [petA])).rows.length, 0)
    await assert.rejects(
      db.query("select public.save_growth_record($1, current_date, 3, 'care')", [petA]),
      /forbidden/,
    )
  })
})

test("growth writes validate future dates and reject stale versions", async () => {
  await asUser(userA, async () => {
    const record = (
      await db.query("select (public.save_growth_record($1, '2024-02-29', 3, 'care')).id", [petA])
    ).rows[0].id
    await db.query("select public.save_growth_record($1, '2024-02-28', null, 'memo', $2, 1)", [
      petA,
      record,
    ])
    await assert.rejects(
      db.query("select public.save_growth_record($1, '2024-02-28', 4, 'stale', $2, 1)", [
        petA,
        record,
      ]),
      /conflict/,
    )
    await assert.rejects(
      db.query("select public.save_growth_record($1, '2099-01-01', 3, 'future')", [petA]),
      /validation/,
    )
    await assert.rejects(
      db.query("select public.update_profile('user_a','Name','','invalid_timezone')"),
      /validation/,
    )
    assert.equal(
      (await db.query("select version from public.growth_records where id=$1", [record])).rows[0]
        .version,
      2,
    )
  })
})

test("uploads require a live owner reservation and private objects remain isolated", async () => {
  await asUser(userA, async () => {
    const reservation = (
      await db.query("select * from public.reserve_media(1024,'image/png','post_photo')")
    ).rows[0]
    assetA = reservation.object_key
    assert.equal(Number(reservation.expected_bytes), 1024)
    assert.equal(Number(reservation.reserved_bytes), 5242880)
    await db.query("insert into storage.objects(bucket_id,name) values('pet-media',$1)", [assetA])
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('pet-media','arbitrary')"),
      /row-level security/,
    )
    await assert.rejects(
      db.query("update public.media_assets set status='ready'"),
      /permission denied/,
    )
  })
  await asUser(userB, async () => {
    assert.equal(
      (await db.query("select * from storage.objects where name=$1", [assetA])).rows.length,
      0,
    )
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('pet-media',$1)", [assetA]),
      /row-level security/,
    )
  })
  await asUser(null, async () => {
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0)
  })
})

test("a broad extra storage policy cannot override the private bucket guards", async () => {
  await db.exec(
    "create policy broad_fixture_policy on storage.objects for all to authenticated, anon using(true) with check(true)",
  )
  await asUser(userB, async () => {
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0)
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('pet-media','spoof')"),
      /row-level security/,
    )
  })
  await asUser(userA, async () => {
    assert.equal((await db.query("delete from storage.objects returning id")).rows.length, 0)
    assert.equal(
      (await db.query("update storage.objects set name='changed' returning id")).rows.length,
      0,
    )
  })
})

test("upload quotas, unverified accounts and deleting accounts cannot bypass write gates", async () => {
  await asUser(userA, async () => {
    await assert.rejects(
      db.query("select public.reserve_media(5242881,'image/png','post_photo')"),
      /validation/,
    )
    await db.query("select public.reserve_media(1024,'image/png','post_photo')")
    await db.query("select public.reserve_media(1024,'image/png','post_photo')")
    await assert.rejects(
      db.query("select public.reserve_media(1024,'image/png','post_photo')"),
      /rate_limited/,
    )
  })
  await db.query("update auth.users set email_confirmed_at=null where id=$1", [userB])
  await asUser(userB, async () => {
    await assert.rejects(db.query("select public.create_pet('No','CAT','Mix')"), /unauthorized/)
  })
  await db.query("update public.profiles set account_state='deleting' where id=$1", [userA])
  await asUser(userA, async () => {
    await assert.rejects(db.query("select public.create_pet('No','CAT','Mix')"), /unauthorized/)
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0)
  })
})
