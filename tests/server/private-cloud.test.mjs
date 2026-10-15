import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
const db = new PGlite()
const A = "00000000-0000-0000-0000-000000000001",
  B = "00000000-0000-0000-0000-000000000002"
const PET = "10000000-0000-0000-0000-000000000001",
  GROWTH = "20000000-0000-0000-0000-000000000001",
  POST = "30000000-0000-0000-0000-000000000001"
let asset
async function as(id, action, role = id === null ? "anon" : "authenticated") {
  await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""])
  try {
    return await action()
  } finally {
    await db.exec("reset role")
    await db.query("select set_config('request.jwt.claim.sub','',false)")
  }
}
before(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
  create schema auth;create schema storage;
  create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema public,auth,storage to anon,authenticated,service_role;
  grant execute on function auth.uid() to anon,authenticated,service_role;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon,authenticated,service_role;`)
  for (const name of [
    "202610140001_server_foundation.sql",
    "202610150001_private_cloud.sql",
    "202610150002_conflict_http_status.sql",
  ]) {
    await db.exec(
      await readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8"),
    )
  }
  await db.query("insert into auth.users values($1,now()),($2,now())", [A, B])
  for (const id of [A, B]) await as(id, () => db.query("select public.ensure_profile()"))
})
after(() => db.close())
test("pet creates are idempotent, edits are versioned and other owners/anonymous cannot write", async () => {
  await as(A, async () => {
    for (let i = 0; i < 2; i++)
      await db.query("select public.save_pet($1,'Cloud Cat','CAT','Mix')", [PET])
    assert.equal((await db.query("select * from public.pets")).rows.length, 1)
    await db.query("select public.save_pet($1,'Mochi','CAT','Mix',1)", [PET])
    await assert.rejects(
      db.query("select public.save_pet($1,'stale','CAT','Mix',1)", [PET]),
      (error) => error.code === "PT409" && /conflict/.test(error.message),
    )
  })
  await as(B, async () => {
    assert.equal((await db.query("select * from public.pets")).rows.length, 0)
    await assert.rejects(
      db.query("select public.save_pet($1,'spoof','CAT','Mix',2)", [PET]),
      /conflict/,
    )
    await assert.rejects(db.query("select public.delete_pet($1,2)", [PET]), /conflict/)
  })
  await as(null, () =>
    assert.rejects(
      db.query("select public.save_pet($1,'Anon','CAT','Mix')", [PET]),
      /permission denied/,
    ),
  )
})
test("growth upsert does not duplicate retries and cannot overwrite stale or foreign records", async () => {
  await as(A, async () => {
    for (let i = 0; i < 2; i++)
      await db.query("select public.upsert_growth_record($1,$2,current_date,3,'care')", [
        GROWTH,
        PET,
      ])
    assert.equal((await db.query("select * from public.growth_records")).rows.length, 1)
    await db.query("select public.upsert_growth_record($1,$2,current_date,4,'updated',1)", [
      GROWTH,
      PET,
    ])
    await assert.rejects(db.query("select public.delete_growth_record($1,1)", [GROWTH]), /conflict/)
    await assert.rejects(db.query("select public.delete_pet($1,2)", [PET]), /foreign key/)
  })
  await as(B, async () => {
    await assert.rejects(
      db.query("select public.upsert_growth_record($1,$2,current_date,5,'spoof',2)", [GROWTH, PET]),
      /forbidden/,
    )
    await assert.rejects(db.query("select public.delete_growth_record($1,2)", [GROWTH]), /conflict/)
  })
})
test("only a trusted finalizer can make decoded images ready; pending media cannot be posted", async () => {
  await as(A, async () => {
    asset = (await db.query("select * from public.reserve_media(100,'image/png','post_photo')"))
      .rows[0]
    assert.equal(Number(asset.reserved_bytes), 10485760)
    await db.query("insert into storage.objects(bucket_id,name) values('pet-media',$1)", [
      asset.object_key,
    ])
    await assert.rejects(
      db.query("select public.save_private_post($1,$2,$3,'pending')", [POST, PET, asset.id]),
      /invalid_media/,
    )
    await assert.rejects(
      db.query("select public.claim_media($1,$2)", [asset.id, A]),
      /permission denied/,
    )
    await assert.rejects(
      db.query("select public.finish_media($1,$2,90,10,10)", [asset.id, A]),
      /permission denied/,
    )
  })
  await as(
    null,
    () => assert.rejects(db.query("select public.claim_media($1,$2)", [asset.id, B]), /forbidden/),
    "service_role",
  )
  await as(
    null,
    async () => {
      await db.query("select public.claim_media($1,$2)", [asset.id, A])
      await assert.rejects(
        db.query("select public.claim_media($1,$2)", [asset.id, A]),
        /busy_or_expired/,
      )
      await db.query("insert into storage.objects(bucket_id,name) values('pet-media',$1)", [
        `${A}/${asset.id}/display.webp`,
      ])
      await db.query("select public.finish_media($1,$2,90,10,10)", [asset.id, A])
    },
    "service_role",
  )
})
test("private post reads and signed-image policy stay owner-only and edits reject stale versions", async () => {
  await as(A, async () => {
    for (let i = 0; i < 2; i++)
      await db.query("select public.save_private_post($1,$2,$3,'Private story')", [
        POST,
        PET,
        asset.id,
      ])
    assert.equal((await db.query("select * from public.posts")).rows.length, 1)
    assert.equal(
      (await db.query("select visibility from public.posts")).rows[0].visibility,
      "private",
    )
    const objects = (await db.query("select name from storage.objects")).rows
    assert.equal(objects.length, 1)
    assert.equal(objects[0].name, `${A}/${asset.id}/display.webp`)
    await db.query("select public.save_private_post($1,$2,$3,'Edited',1)", [POST, PET, asset.id])
    await assert.rejects(
      db.query("select public.save_private_post($1,$2,$3,'stale',1)", [POST, PET, asset.id]),
      /conflict/,
    )
  })
  await as(B, async () => {
    assert.equal((await db.query("select * from public.posts")).rows.length, 0)
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0)
    await assert.rejects(db.query("select public.delete_private_post($1,2)", [POST]), /conflict/)
  })
  await as(null, () => assert.rejects(db.query("select * from public.posts"), /permission denied/))
})
test("post deletion hides media immediately and never frees quota before physical cleanup succeeds", async () => {
  await as(A, async () => {
    await db.query("select public.delete_private_post($1,2)", [POST])
    assert.equal((await db.query("select * from public.posts")).rows.length, 0)
    assert.equal((await db.query("select * from storage.objects")).rows.length, 0)
    assert.equal(
      Number(
        (await db.query("select reserved_bytes from public.media_assets where id=$1", [asset.id]))
          .rows[0].reserved_bytes,
      ),
      190,
    )
  })
  await as(
    null,
    async () => {
      await db.query("select public.reconcile_media_cleanup($1)", [A])
      assert.equal(
        Number(
          (await db.query("select reserved_bytes from public.media_assets where id=$1", [asset.id]))
            .rows[0].reserved_bytes,
        ),
        190,
      )
      await db.query("delete from storage.objects where bucket_id='pet-media'")
      await db.query("update public.cleanup_jobs set status='done' where owner_id=$1", [A])
      await db.query("select public.reconcile_media_cleanup($1)", [A])
      assert.equal(
        Number(
          (await db.query("select reserved_bytes from public.media_assets where id=$1", [asset.id]))
            .rows[0].reserved_bytes,
        ),
        0,
      )
    },
    "service_role",
  )
  await as(A, async () => {
    await db.query("select public.delete_growth_record($1,2)", [GROWTH])
    await db.query("select public.delete_pet($1,2)", [PET])
    assert.equal((await db.query("select * from public.pets")).rows.length, 0)
  })
})
