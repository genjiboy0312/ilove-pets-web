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
    "202610150005_notifications.sql",
    "202610150006_local_import.sql",
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

const rpc = (name, args = []) => db.query(`select * from public.${name}`, args)
const feed = () => rpc("notifications_feed()")
const unread = async () =>
  Number((await rpc("notifications_unread()")).rows[0].notifications_unread)
let likeId, commentId, followId, postAsset
test("notifications are transactional, duplicate-safe and exclude self reactions", async () => {
  postAsset = await ready(A, "post_photo")
  await as(A, async () => {
    await rpc("save_pet($1,'Pet','CAT','Mix')", [PET])
    await rpc("save_private_post($1,$2,$3,'Post')", [POST, PET, postAsset])
    await rpc("set_post_visibility($1,true,1)", [POST])
    await rpc("set_post_like($1,true)", [POST])
    assert.equal(await unread(), 0)
  })
  const comment = "40000000-0000-0000-0000-000000000001"
  await as(B, async () => {
    for (let n = 0; n < 2; n++) {
      await rpc("set_follow($1,true)", [A])
      await rpc("set_post_like($1,true)", [POST])
      await rpc("save_social_comment($1,$2,'private preview text')", [comment, POST])
    }
    assert.deepEqual((await feed()).rows, [])
  })
  await as(A, async () => {
    const rows = (await feed()).rows
    assert.equal(rows.length, 3)
    assert.equal(await unread(), 3)
    assert.equal(
      rows.some((r) => "content" in r || "comment_preview" in r),
      false,
    )
    likeId = rows.find((r) => r.kind === "like").id
    commentId = rows.find((r) => r.kind === "comment").id
    followId = rows.find((r) => r.kind === "follow").id
    await rpc("read_notification($1)", [followId])
    assert.equal(await unread(), 2)
  })
  await as(B, () => assert.rejects(rpc("read_notification($1)", [likeId]), { code: "PT404" }))
  for (const id of [A, B, null])
    await as(id, () =>
      assert.rejects(db.query("select * from public.notifications"), { code: "42501" }),
    )
  await as(null, () => assert.rejects(feed(), { code: "42501" }))
})
test("undo/private/deletion withdraw notifications and prevent stale opens; re-follow retains read state", async () => {
  await as(B, async () => {
    await rpc("set_follow($1,false)", [A])
    await rpc("set_post_like($1,false)", [POST])
    await rpc("delete_social_comment($1)", ["40000000-0000-0000-0000-000000000001"])
  })
  await as(A, async () => {
    assert.equal((await feed()).rows.length, 0)
    assert.equal(await unread(), 0)
    await assert.rejects(rpc("read_notification($1)", [commentId]), { code: "PT404" })
  })
  await as(B, async () => {
    await rpc("set_follow($1,true)", [A])
    await rpc("set_post_like($1,true)", [POST])
  })
  await as(A, async () => {
    assert.equal(await unread(), 1)
    assert.ok((await feed()).rows.find((r) => r.id === followId).read_at)
    await rpc("set_post_visibility($1,false,2)", [POST])
    assert.equal((await feed()).rows.length, 1)
    assert.equal(await unread(), 0)
    await assert.rejects(rpc("read_notification($1)", [likeId]), { code: "PT404" })
    await rpc("set_post_visibility($1,true,3)", [POST])
    await rpc("read_all_notifications()")
    assert.equal(await unread(), 0)
  })
})
test("notification cursor pagination has no duplicate or missing items", async () => {
  await as(B, async () => {
    for (let n = 0; n < 32; n++)
      await rpc("save_social_comment(gen_random_uuid(),$1,'next')", [POST])
  })
  await as(A, async () => {
    const first = (await feed()).rows
    assert.equal(first.length, 30)
    const last = first.at(-1)
    const next = (await rpc("notifications_feed($1,$2)", [last.created_at, last.id])).rows
    assert.equal(next.length, 4)
    assert.equal(new Set([...first, ...next].map((r) => r.id)).size, 34)
  })
})
const prepare = async (kind, source, payload, photo = null, pet = null) => {
  const r = await rpc("prepare_local_import($1,$2,$3,$4,$5)", [kind, source, payload, photo, pet])
  return r.rows[0]
}
let petReceipt, petPhoto, postReceipt, importedPost
const petPayload = {
  name: "Local pet",
  category: "DOG",
  breed: "Mix",
  createdAt: "2026-10-01T00:00:00.000Z",
}
const postPayload = {
  content: "Private imported post",
  tags: ["pet"],
  createdAt: "2026-10-02T00:00:00.000Z",
  liked: true,
  comments: [
    { id: "old-comment", content: "Private local note", createdAt: "2026-10-03T00:00:00.000Z" },
  ],
}
test("import reservations are owner-scoped, immutable and idempotent", async () => {
  await as(A, async () => {
    petReceipt = await prepare("pet", "pet_local_1", petPayload, "a".repeat(64))
    const again = await prepare("pet", "pet_local_1", petPayload, "a".repeat(64))
    assert.equal(again.id, petReceipt.id)
    assert.equal(again.target_id, petReceipt.target_id)
    await assert.rejects(
      prepare("pet", "pet_local_1", { ...petPayload, name: "changed" }, "a".repeat(64)),
      { code: "PT409" },
    )
    await assert.rejects(prepare("pet", "pet_local_1", petPayload, "b".repeat(64)), {
      code: "PT409",
    })
    await assert.rejects(rpc("finish_local_import($1)", [petReceipt.id]), { code: "22023" })
  })
  await as(B, async () => {
    assert.equal((await rpc("local_import_history(null,true)")).rows.length, 0)
    await assert.rejects(rpc("finish_local_import($1)", [petReceipt.id]), { code: "42501" })
    await assert.rejects(
      prepare("growth", "forged", { date: "2026-10-01", note: "x" }, null, PET),
      { code: "42501" },
    )
  })
  await as(null, () => assert.rejects(rpc("local_import_history()"), { code: "42501" }))
  await as(A, () =>
    assert.rejects(db.query("select * from public.local_import_items"), { code: "42501" }),
  )
})
test("pet import resumes after failure, archives photo privately and protects it from cleanup", async () => {
  petPhoto = await ready(A, "pet_avatar")
  const forged = await ready(B, "pet_avatar")
  await as(A, async () => {
    await assert.rejects(rpc("attach_local_import_media($1,$2)", [petReceipt.id, forged]), {
      code: "22023",
    })
    await rpc("attach_local_import_media($1,$2)", [petReceipt.id, petPhoto])
    await rpc("finish_local_import($1)", [petReceipt.id])
    await rpc("finish_local_import($1)", [petReceipt.id])
    assert.equal(
      (await db.query("select * from public.pets where id=$1", [petReceipt.target_id])).rows.length,
      1,
    )
    await assert.rejects(rpc("discard_media($1)", [petPhoto]), { code: "23503" })
    assert.ok((await rpc("own_story_assets()")).rows[0].own_story_assets.includes(petPhoto))
  })
  await as(null, async () =>
    assert.equal((await rpc("social_asset($1)", [petPhoto])).rows[0].social_asset, null),
  )
})
test("posts/growth import atomically, preserve private source notes and never generate social reactions", async () => {
  const photo = await ready(A, "post_photo")
  await as(A, async () => {
    postReceipt = await prepare(
      "post",
      "post_local_1",
      postPayload,
      "c".repeat(64),
      petReceipt.target_id,
    )
    await rpc("attach_local_import_media($1,$2)", [postReceipt.id, photo])
    importedPost = (await rpc("finish_local_import($1)", [postReceipt.id])).rows[0]
      .finish_local_import
    const retry = await prepare(
      "post",
      "post_local_1",
      postPayload,
      "c".repeat(64),
      petReceipt.target_id,
    )
    assert.ok(retry.completed_at)
    assert.equal(retry.target_id, importedPost)
    await rpc("finish_local_import($1)", [postReceipt.id])
    const p = (await db.query("select * from public.posts where id=$1", [importedPost])).rows[0]
    assert.equal(p.visibility, "private")
    assert.equal(p.source_created_at.toISOString(), "2026-10-02T00:00:00.000Z")
    assert.deepEqual(p.tags, ["pet"])
    const growth = await prepare(
      "growth",
      "pet_local_1/growth1",
      { date: "2026-10-01", weightKg: 3, note: "Original note" },
      null,
      petReceipt.target_id,
    )
    await rpc("finish_local_import($1)", [growth.id])
    await rpc("finish_local_import($1)", [growth.id])
    const archive = (await rpc("local_import_history()")).rows.find((r) => r.id === postReceipt.id)
    assert.equal(archive.payload.comments[0].content, "Private local note")
  })
  assert.equal(
    (
      await db.query("select count(*)::int as n from public.post_likes where post_id=$1", [
        importedPost,
      ])
    ).rows[0].n,
    0,
  )
  assert.equal(
    (
      await db.query("select count(*)::int as n from public.post_comments where post_id=$1", [
        importedPost,
      ])
    ).rows[0].n,
    0,
  )
  await as(null, async () =>
    assert.equal((await rpc("social_feed(p_id=>$1)", [importedPost])).rows.length, 0),
  )
  await as(B, async () => assert.equal((await rpc("local_import_history()")).rows.length, 0))
})
test("mapping does not overwrite existing pets; deleted imports are not resurrected by retry", async () => {
  await as(A, async () => {
    const mapped = await prepare(
      "pet",
      "mapped_pet",
      { ...petPayload, name: "Different name" },
      null,
      PET,
    )
    await rpc("finish_local_import($1)", [mapped.id])
    assert.equal(
      (await db.query("select name from public.pets where id=$1", [PET])).rows[0].name,
      "Pet",
    )
    await assert.rejects(
      prepare(
        "pet",
        "mapped_pet",
        { ...petPayload, name: "Different name" },
        null,
        petReceipt.target_id,
      ),
      { code: "PT409" },
    )
    await rpc("delete_private_post($1,1)", [importedPost])
    await rpc("finish_local_import($1)", [postReceipt.id])
    assert.equal(
      (await db.query("select id from public.posts where id=$1", [importedPost])).rows.length,
      0,
    )
    assert.equal(
      (await rpc("local_import_history()")).rows.filter((r) => r.source_id === "post_local_1")
        .length,
      1,
    )
  })
})
