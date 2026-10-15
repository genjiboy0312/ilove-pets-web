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
  ]) {
    await db.exec(
      await readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8"),
    )
  }
  await db.query("insert into auth.users values($1,now()),($2,now())", [A, B])
  for (const id of [A, B]) await as(id, () => db.query("select public.ensure_profile()"))
})
after(() => db.close())

async function media(owner) {
  const result = await as(owner, () =>
    db.query("select (public.reserve_media(3,'image/png','post_photo')).id as id"),
  )
  const id = result.rows[0].id
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
let postAsset, storyAsset
test("private stays private; explicit versioned publication exposes only a public projection", async () => {
  await as(A, () => db.query("select public.save_pet($1,'Cat','CAT','Mix')", [PET]))
  postAsset = await media(A)
  await as(A, () =>
    db.query("select public.save_private_post($1,$2,$3,'Public candidate')", [
      POST,
      PET,
      postAsset,
    ]),
  )
  await as(null, async () => {
    assert.equal((await db.query("select * from public.social_feed()")).rows.length, 0)
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [postAsset])).rows[0].key,
      null,
    )
  })
  await as(B, () =>
    assert.rejects(db.query("select public.set_post_visibility($1,true,1)", [POST]), {
      code: "PT409",
    }),
  )
  await as(A, () => db.query("select public.set_post_visibility($1,true,1)", [POST]))
  await as(null, async () => {
    const rows = (await db.query("select * from public.social_feed()")).rows
    assert.equal(rows.length, 1)
    assert.equal(rows[0].pet_name, "Cat")
    assert.equal("timezone" in rows[0], false)
    assert.equal("bio" in rows[0], false)
    assert.match(
      (await db.query("select public.social_asset($1) as key", [postAsset])).rows[0].key,
      /display.webp$/,
    )
    await assert.rejects(
      db.query("select public.set_post_like($1,true)", [POST]),
      /permission denied/,
    )
  })
})
test("likes and comments are idempotent; foreign deletion and private interaction are rejected", async () => {
  await as(B, async () => {
    await db.query("select public.set_post_like($1,true)", [POST])
    await db.query("select public.set_post_like($1,true)", [POST])
    for (let i = 0; i < 2; i++)
      await db.query("select public.save_social_comment($1,$2,'hello')", [GROWTH, POST])
    const row = (await db.query("select * from public.social_feed()")).rows[0]
    assert.equal(Number(row.likes), 1)
    assert.equal(Number(row.comments), 1)
    assert.equal(row.liked, true)
  })
  const C = "00000000-0000-0000-0000-000000000003"
  await db.query("insert into auth.users values($1,now())", [C])
  await as(C, () => db.query("select public.ensure_profile()"))
  await as(C, () =>
    assert.rejects(db.query("select public.delete_social_comment($1)", [GROWTH]), /forbidden/),
  )
  await as(A, () => db.query("select public.set_post_visibility($1,false,2)", [POST]))
  await as(B, async () => {
    assert.equal(
      (await db.query("select * from public.social_comments($1)", [POST])).rows.length,
      0,
    )
    await assert.rejects(db.query("select public.set_post_like($1,true)", [POST]), {
      code: "PT404",
    })
  })
  await as(null, async () =>
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [postAsset])).rows[0].key,
      null,
    ),
  )
})
test("stories are follower-only, have idempotent views and cannot be reused or discarded live", async () => {
  storyAsset = await media(A)
  await as(A, async () => {
    for (let i = 0; i < 2; i++)
      await db.query("select public.create_story($1,$2,'24h')", [PET, storyAsset])
    assert.equal((await db.query("select * from public.stories_feed()")).rows.length, 1)
    await assert.rejects(db.query("select public.discard_media($1)", [storyAsset]), {
      code: "23503",
    })
    await assert.rejects(
      db.query("select public.save_private_post($1,$2,$3,'reuse')", [B, PET, storyAsset]),
      { code: "23503" },
    )
  })
  await as(B, async () => {
    assert.equal((await db.query("select * from public.stories_feed()")).rows.length, 0)
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [storyAsset])).rows[0].key,
      null,
    )
    await db.query("select public.set_follow($1,true)", [A])
    assert.equal((await db.query("select * from public.stories_feed()")).rows.length, 1)
    for (let i = 0; i < 2; i++) await db.query("select public.view_story($1)", [PET])
    assert.equal((await db.query("select * from public.stories_feed()")).rows[0].views, null)
    await assert.rejects(db.query("select * from public.stories"), /permission denied/)
  })
  await as(A, async () =>
    assert.equal(Number((await db.query("select * from public.stories_feed()")).rows[0].views), 1),
  )
  await as(B, async () => {
    await db.query("select public.set_follow($1,false)", [A])
    assert.equal((await db.query("select * from public.stories_feed()")).rows.length, 0)
    await assert.rejects(db.query("select public.view_story($1)", [PET]), { code: "PT404" })
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [storyAsset])).rows[0].key,
      null,
    )
    await db.query("select public.set_follow($1,true)", [A])
  })
})
test("expiry blocks new image reads immediately, then owner cleanup queues physical deletion", async () => {
  await db.query(
    "update public.stories set created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id=$1",
    [PET],
  )
  await as(B, async () => {
    assert.equal((await db.query("select * from public.stories_feed()")).rows.length, 0)
    assert.equal(
      (await db.query("select public.social_asset($1) as key", [storyAsset])).rows[0].key,
      null,
    )
  })
  await as(A, () => db.query("select public.expire_own_stories()"))
  assert.equal(
    (await db.query("select status from public.media_assets where id=$1", [storyAsset])).rows[0]
      .status,
    "deleting",
  )
  assert.equal(
    Number(
      (await db.query("select count(*) from public.cleanup_jobs where owner_id=$1", [A])).rows[0]
        .count,
    ),
    2,
  )
})
