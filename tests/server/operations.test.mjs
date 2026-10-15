import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
const db = new PGlite()
let postHelperOid
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
    "202610150005_notifications.sql",
    "202610150006_local_import.sql",
    "202610150007_operations.sql",
  ]) {
    if (name === "202610150007_operations.sql")
      postHelperOid = (
        await db.query("select 'app_private.public_post(uuid)'::regprocedure::oid as id")
      ).rows[0].id
    try {
      await db.exec(
        await readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8"),
      )
    } catch (error) {
      console.error(
        name,
        error.position,
        error.query?.slice(Number(error.position) - 160, Number(error.position) + 80),
      )
      throw error
    }
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

const rpc = (name, args = []) => db.query(`select * from public.${name}`, args)
const feed = () => rpc("notifications_feed()")
let media, profileB

test("operations migrations restrict all privileged endpoints and queue tables", async () => {
  assert.equal(
    (await db.query("select 'app_private.public_post(uuid)'::regprocedure::oid as id")).rows[0].id,
    postHelperOid,
  )
  for (const fn of [
    "ops_prepare_cleanup()",
    "ops_claim_cleanup(NULL)",
    "ops_claim_deletions()",
    "ops_health()",
  ]) {
    await assert.rejects(
      as(A, () => rpc(fn)),
      /permission denied/,
    )
  }
  await assert.rejects(
    as(A, () => db.query("select * from public.content_reports")),
    /permission denied/,
  )
  await assert.rejects(
    as(null, () => rpc("report_content('post',gen_random_uuid(),'spam','')")),
    /permission denied/,
  )
})
test("reports validate visibility, are idempotent and only operators can hide content", async () => {
  await as(A, () => rpc("save_pet($1,'Pet','CAT','Mix')", [PET]))
  media = await ready(A, "post_photo")
  await as(A, () => rpc("save_private_post($1,$2,$3,'Public test')", [POST, PET, media]))
  await assert.rejects(
    as(B, () => rpc("report_content('post',$1,'spam','')", [POST])),
    /not_found/,
  )
  await as(A, () => rpc("set_post_visibility($1,true,1)", [POST]))
  const id = (await as(B, () => rpc("report_content('post',$1,'spam','test')", [POST]))).rows[0]
    .report_content
  assert.equal(
    (await as(B, () => rpc("report_content('post',$1,'other','changed')", [POST]))).rows[0]
      .report_content,
    id,
  )
  await assert.rejects(
    as(B, () => rpc("ops_resolve_report($1,true)", [id])),
    /permission denied/,
  )
  await as(null, () => rpc("ops_resolve_report($1,true)", [id]), "service_role")
  assert.deepEqual((await as(null, () => rpc("social_feed()"))).rows, [])
  assert.equal((await as(null, () => rpc("social_asset($1)", [media]))).rows[0].social_asset, null)
  await db.exec("delete from public.moderation_targets")
})
test("blocks hide profiles, posts, comments, images and notifications in both directions", async () => {
  await as(B, () => rpc("set_follow($1,true)", [A]))
  await as(B, () => rpc("save_social_comment(gen_random_uuid(),$1,'Comment')", [POST]))
  profileB = (await as(B, () => rpc("social_profile()"))).rows[0]
  await as(B, () => rpc("save_social_profile($1,'Family B','',null,1)", [profileB.username]))
  await as(B, () => rpc("set_user_block($1,true)", [A]))
  assert.equal((await as(B, () => rpc("blocked_users()"))).rows.length, 1)
  assert.deepEqual((await as(B, () => rpc("social_feed()"))).rows, [])
  assert.deepEqual((await as(A, () => rpc("social_profile($1)", [profileB.username]))).rows, [])
  assert.equal((await as(B, () => rpc("social_asset($1)", [media]))).rows[0].social_asset, null)
  assert.deepEqual((await as(A, feed)).rows, [])
  await assert.rejects(
    as(A, () => rpc("set_follow($1,true)", [B])),
    /forbidden/,
  )
  await assert.rejects(
    as(B, () => rpc("set_post_like($1,true)", [POST])),
    /not_found/,
  )
  await as(B, () => rpc("set_user_block($1,false)", [A]))
  assert.equal((await as(B, () => rpc("social_feed()"))).rows.length, 1)
  assert.equal((await db.query("select count(*) from public.follows")).rows[0].count, 0)
})
test("scheduled expiry queues both story objects without a visit and preserves live/imported assets", async () => {
  const asset = await ready(A, "post_photo"),
    story = "50000000-0000-0000-0000-000000000001"
  await as(A, () => rpc("create_story($1,$2,'Story')", [story, asset]))
  await db.query(
    "update public.stories set created_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1",
    [story],
  )
  await as(null, () => rpc("ops_prepare_cleanup()"), "service_role")
  assert.equal(
    (await db.query("select count(*) from public.cleanup_jobs where owner_id=$1", [A])).rows[0]
      .count,
    2,
  )
  assert.equal(
    (await db.query("select status from public.media_assets where id=$1", [media])).rows[0].status,
    "ready",
  )
  const jobs = (await as(null, () => rpc("ops_claim_cleanup(NULL)"), "service_role")).rows
  assert.equal(jobs.length, 2)
  await as(
    null,
    () => rpc("ops_finish_cleanup($1,$2,false)", [jobs[0].id, jobs[0].lease_token]),
    "service_role",
  )
  assert.equal(
    (await db.query("select reserved_bytes from public.media_assets where id=$1", [asset])).rows[0]
      .reserved_bytes,
    5,
  )
  await as(
    null,
    () => rpc("ops_finish_cleanup($1,$2,true)", [jobs[1].id, jobs[1].lease_token]),
    "service_role",
  )
  assert.equal(
    (await as(null, () => rpc("ops_claim_cleanup(NULL)"), "service_role")).rows.length,
    0,
  )
  await db.query(
    "update public.cleanup_jobs set next_attempt_at=now()-interval '1 second' where id=$1",
    [jobs[0].id],
  )
  const retry = (await as(null, () => rpc("ops_claim_cleanup(NULL)"), "service_role")).rows[0]
  assert.equal(
    (
      await as(
        null,
        () => rpc("ops_finish_cleanup($1,$2,true)", [retry.id, jobs[0].lease_token]),
        "service_role",
      )
    ).rows[0].ops_finish_cleanup,
    false,
  )
  await as(
    null,
    () => rpc("ops_finish_cleanup($1,$2,true)", [retry.id, retry.lease_token]),
    "service_role",
  )
  assert.equal(
    (await db.query("select reserved_bytes from public.media_assets where id=$1", [asset])).rows[0]
      .reserved_bytes,
    0,
  )
})
test("report limits return HTTP 429 and do not expose private report details", async () => {
  await db.query(
    "insert into public.content_reports(reporter_id,target_kind,target_id,reason) select $1,'post',gen_random_uuid(),'spam' from generate_series(1,20)",
    [B],
  )
  await assert.rejects(
    as(B, () => rpc("report_content('profile',$1,'spam','')", [A])),
    (e) => e.code === "PT429",
  )
})
test("deletion is idempotent, denies writes immediately and does not refund pending bytes", async () => {
  const args = [A]
  const first = (await as(null, () => rpc("ops_begin_account_deletion($1)", args), "service_role"))
    .rows[0].ops_begin_account_deletion
  assert.equal(
    (await as(null, () => rpc("ops_begin_account_deletion($1)", args), "service_role")).rows[0]
      .ops_begin_account_deletion,
    first,
  )
  assert.deepEqual((await as(null, () => rpc("social_feed()"))).rows, [])
  await assert.rejects(
    as(A, () => rpc("save_pet(gen_random_uuid(),'No','CAT','Mix')")),
    /unauthorized/,
  )
  await assert.rejects(
    as(A, () => rpc("reserve_media(3,'image/png','post_photo')")),
    /unauthorized/,
  )
  assert.ok(
    (await db.query("select reserved_bytes from public.media_assets where id=$1", [media])).rows[0]
      .reserved_bytes > 0,
  )
  assert.equal((await as(null, () => rpc("ops_claim_deletions()"), "service_role")).rows.length, 0)
  for (const job of (await as(null, () => rpc("ops_claim_cleanup(NULL)"), "service_role")).rows)
    await as(
      null,
      () => rpc("ops_finish_cleanup($1,$2,true)", [job.id, job.lease_token]),
      "service_role",
    )
  await db.query(
    "update public.account_deletion_jobs set not_before=now()-interval '1 second' where owner_id=$1",
    [A],
  )
  const claim = (await as(null, () => rpc("ops_claim_deletions()"), "service_role")).rows[0]
  assert.equal(claim.owner_id, A)
  await db.query("delete from auth.users where id=$1", [A])
  await as(
    null,
    () => rpc("ops_finish_deletion($1,$2,true)", [claim.id, claim.lease_token]),
    "service_role",
  )
  assert.equal(
    (await db.query("select status from public.account_deletion_jobs where id=$1", [first])).rows[0]
      .status,
    "done",
  )
  assert.ok(
    (await db.query("select count(*) from public.cleanup_jobs where owner_id=$1", [A])).rows[0]
      .count > 0,
  )
})

test("deletion before first profile creation cannot be undone by ensure_profile", async () => {
  const C = "00000000-0000-0000-0000-000000000003"
  await db.query("insert into auth.users values($1,now())", [C])
  await as(null, () => rpc("ops_begin_account_deletion($1)", [C]), "service_role")
  await assert.rejects(
    as(C, () => rpc("ensure_profile()")),
    /forbidden/,
  )
  assert.equal(
    (await db.query("select account_state from public.profiles where id=$1", [C])).rows[0]
      .account_state,
    "deleting",
  )
})
test("an in-flight encoder cannot publish a ready image after deletion has started", async () => {
  const D = "00000000-0000-0000-0000-000000000004"
  await db.query("insert into auth.users values($1,now())", [D])
  await as(D, () => rpc("ensure_profile()"))
  const asset = (await as(D, () => rpc("reserve_media(3,'image/png','post_photo')"))).rows[0]
  await as(null, () => rpc("claim_media($1,$2)", [asset.id, D]), "service_role")
  await as(null, () => rpc("ops_begin_account_deletion($1)", [D]), "service_role")
  await assert.rejects(
    as(null, () => rpc("finish_media($1,$2,2,32,24)", [asset.id, D]), "service_role"),
    /forbidden/,
  )
  await as(null, () => rpc("fail_media($1,$2)", [asset.id, D]), "service_role")
  assert.equal(
    (await db.query("select status from public.media_assets where id=$1", [asset.id])).rows[0]
      .status,
    "deleting",
  )
})
