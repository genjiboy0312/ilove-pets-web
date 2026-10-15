import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import { PGlite } from "@electric-sql/pglite"
import {
  backupTables,
  encrypt,
  decrypt,
  sha256,
  restoreSql,
} from "../../scripts/backup-archive.mjs"
async function database() {
  const db = new PGlite()
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,reauthentication_token text default '');
 create table auth.identities(id uuid primary key,user_id uuid references auth.users(id));
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
 alter table storage.objects enable row level security; grant all on storage.objects to anon,authenticated,service_role;`)
  for (const name of [
    "202610140001_server_foundation.sql",
    "202610150001_private_cloud.sql",
    "202610150002_conflict_http_status.sql",
    "202610150003_social_stories.sql",
    "202610150004_profiles_feeds.sql",
    "202610150005_notifications.sql",
    "202610150006_local_import.sql",
    "202610150007_operations.sql",
  ])
    await db.exec(
      await readFile(new URL("../../supabase/migrations/" + name, import.meta.url), "utf8"),
    )
  return db
}
test("encrypted DB and photo backup restores into an isolated empty schema with RLS intact", async () => {
  const source = await database(),
    target = await database()
  try {
    const owner = "00000000-0000-0000-0000-000000000001",
      other = "00000000-0000-0000-0000-000000000002",
      pet = "10000000-0000-0000-0000-000000000001"
    await source.query(
      "insert into auth.users(id,email_confirmed_at,reauthentication_token) values($1,now(),'old-token'),($2,now(),'')",
      [owner, other],
    )
    await source.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
    await source.exec("select public.ensure_profile()")
    await source.query("select public.save_pet($1,'Backup pet','CAT','Mix')", [pet])
    await source.query(
      "select public.upsert_growth_record(gen_random_uuid(),$1,current_date,3,'Preserved growth')",
      [pet],
    )
    const snapshot = {}
    for (const table of backupTables)
      snapshot[table] = (await source.query("select * from " + table)).rows
    const key = randomBytes(32),
      data = Buffer.from(JSON.stringify(snapshot)),
      archive = encrypt(data, key)
    assert.equal(sha256(decrypt(archive, key)), sha256(data))
    assert.throws(() => decrypt(archive, randomBytes(32)))
    const damaged = Buffer.from(archive)
    damaged[damaged.length - 1] ^= 1
    assert.throws(() => decrypt(damaged, key))
    const photo = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])
    assert.deepEqual(decrypt(encrypt(photo, key), key), photo)
    await target.exec(restoreSql(JSON.parse(decrypt(archive, key))))
    assert.equal(
      (await target.query("select reauthentication_token from auth.users where id=$1", [owner]))
        .rows[0].reauthentication_token,
      "",
    )
    assert.equal((await target.query("select name from public.pets")).rows[0].name, "Backup pet")
    assert.equal(
      (await target.query("select note from public.growth_records")).rows[0].note,
      "Preserved growth",
    )
    await target.exec("set role authenticated")
    await target.query("select set_config('request.jwt.claim.sub',$1,false)", [other])
    assert.deepEqual((await target.query("select * from public.pets")).rows, [])
    await target.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
    assert.equal((await target.query("select * from public.pets")).rows.length, 1)
    await target.exec("reset role")
    await assert.rejects(
      target.exec(restoreSql(JSON.parse(decrypt(archive, key)))),
      /restore_target_not_empty/,
    )
    await target.exec("rollback")
  } finally {
    await source.close()
    await target.close()
  }
})
