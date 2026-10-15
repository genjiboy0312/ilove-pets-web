import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
const db = new PGlite()
const A = "00000000-0000-0000-0000-000000000001",
  B = "00000000-0000-0000-0000-000000000002"
const PET = "10000000-0000-0000-0000-000000000001",
  POST = "30000000-0000-0000-0000-000000000001"
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
    "202610150003_social_stories.sql",
    "202610150004_profiles_feeds.sql",
  ]) {
    await db.exec(
      await readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8"),
    )
  }
  await db.query("insert into auth.users values($1,now()),($2,now())", [A, B])
  for (const id of [A, B]) await as(id, () => db.query("select public.ensure_profile()"))
})
after(() => db.close())

async function ready(owner, purpose = "profile_avatar") {
  const r = await as(owner, () =>
    db.query("select (public.reserve_media(3,'image/png',$1)).id as id", [purpose]),
  )
  const id = r.rows[0].id
  await as(
    null,
    async () => {
      await db.query("select public.claim_media($1,$2)", [id, owner])
      await db.query("select public.finish_media($1,$2,2,32,24)", [id, owner])
    },
    "service_role",
  )
  return id
}
let avatar, newAvatar
test("unpublished empty profiles are private; own profile editing publishes only chosen fields", async () => {
  const original = (await as(A, () => db.query("select * from public.social_profile()"))).rows[0]
  await as(null, async () =>
    assert.deepEqual(
      (await db.query("select * from public.social_profile($1)", [original.username])).rows,
      [],
    ),
  )
  avatar = await ready(A)
  await as(A, () =>
    db.query("select public.save_social_profile('alice','Alice','Public bio',$1,1)", [avatar]),
  )
  await as(null, async () => {
    const p = (await db.query("select * from public.social_profile('alice')")).rows[0]
    assert.equal(p.bio, "Public bio")
    assert.equal(p.version, null)
    assert.equal("timezone" in p, false)
    assert.equal("email" in p, false)
    assert.equal(p.avatar_asset_id, avatar)
    assert.match(
      (await db.query("select public.social_asset($1) as key", [avatar])).rows[0].key,
      /display.webp$/,
    )
  })
  await as(B, () =>
    assert.rejects(
      db.query("select public.save_social_profile('bob','Bob','forged',$1,1)", [avatar]),
      { code: "22023" },
    ),
  )
  await as(B, () =>
    assert.rejects(
      db.query("select public.save_social_profile('alice','Bob','duplicate',null,1)"),
      { code: "23505" },
    ),
  )
  await as(A, () =>
    assert.rejects(db.query("select public.save_social_profile('alice','Stale','',null,1)"), {
      code: "PT409",
    }),
  )
})
test("avatar replacement/removal queues old files and protects the active avatar from cleanup", async () => {
  await as(A, () =>
    assert.rejects(db.query("select public.discard_media($1)", [avatar]), { code: "23503" }),
  )
  newAvatar = await ready(A)
  await as(A, async () => {
    await db.query("select public.save_social_profile('alice','Updated Alice','Next bio',$1,2)", [
      newAvatar,
    ])
    const protectedIds = (await db.query("select public.own_story_assets() as ids")).rows[0].ids
    assert.equal(protectedIds.includes(newAvatar), true)
  })
  assert.equal(
    (await db.query("select status from public.media_assets where id=$1", [avatar])).rows[0].status,
    "deleting",
  )
  await as(null, async () =>
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [avatar])).rows[0].key,
      null,
    ),
  )
  await as(A, () =>
    db.query("select public.save_social_profile('alice','Updated Alice','Next bio',null,3)"),
  )
  await as(null, async () =>
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [newAvatar])).rows[0].key,
      null,
    ),
  )
  assert.equal(
    Number(
      (await db.query("select count(*) from public.cleanup_jobs where owner_id=$1", [A])).rows[0]
        .count,
    ),
    4,
  )
})
test("author/following filters apply before pagination and never include private records", async () => {
  await as(A, () => db.query("select public.save_pet($1,'Cat','CAT','Mix')", [PET]))
  await as(B, () => db.query("select public.save_pet($1,'Dog','DOG','Mix')", [B]))
  const asset = await ready(A, "post_photo")
  await as(A, async () => {
    await db.query("select public.save_private_post($1,$2,$3,'A public')", [POST, PET, asset])
    await db.query("select public.set_post_visibility($1,true,1)", [POST])
  })
  for (let i = 0; i < 22; i++) {
    const a = await ready(B, "post_photo")
    await as(B, async () => {
      const p = (
        await db.query(
          "select (public.save_private_post(gen_random_uuid(),$1,$2,'B public')).id as id",
          [B, a],
        )
      ).rows[0].id
      await db.query("select public.set_post_visibility($1,true,1)", [p])
    })
  }
  await as(B, async () => {
    await db.query("select public.set_follow($1,true)", [A])
    const rows = (await db.query("select * from public.social_feed(p_following=>true)")).rows
    assert.equal(rows.length, 1)
    assert.equal(rows[0].owner_id, A)
    assert.equal(
      (await db.query("select * from public.social_feed(p_author=>$1)", [A])).rows.length,
      1,
    )
    await db.query("select public.set_follow($1,false)", [A])
    assert.equal(
      (await db.query("select * from public.social_feed(p_following=>true)")).rows.length,
      0,
    )
  })
  await as(null, async () => {
    const first = (await db.query("select * from public.social_feed()")).rows
    assert.equal(first.length, 20)
    const last = first.at(-1)
    const next = (
      await db.query("select * from public.social_feed($1,$2)", [last.created_at, last.id])
    ).rows
    assert.equal(next.length, 3)
    assert.equal(new Set([...first, ...next].map((p) => p.id)).size, 23)
    assert.deepEqual(
      (await db.query("select * from public.social_feed(p_following=>true)")).rows,
      [],
    )
  })
})
