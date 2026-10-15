import { test } from "node:test"
import assert from "node:assert/strict"
import { handleMediaRequest } from "../../supabase/functions/_shared/mediaHandler.mjs"
const OWNER = "00000000-0000-0000-0000-000000000001",
  ASSET = "10000000-0000-0000-0000-000000000001"
const origin = "https://ilove-pets-web.pages.dev"
function fixture({
  user = OWNER,
  decodeFails = false,
  size = 3,
  ready = false,
  removeFails = false,
} = {}) {
  const calls = []
  const result = (data = null, error = null) => Promise.resolve({ data, error })
  const jobs = [{ id: "job1", object_key: OWNER + "/original" }]
  const chain = {
    select() {
      return this
    },
    eq() {
      return this
    },
    limit() {
      return result(jobs)
    },
    update(value) {
      calls.push(["update", value])
      return {
        eq() {
          return {
            eq() {
              return result()
            },
          }
        },
      }
    },
  }
  const bucket = {
    download(key) {
      calls.push(["download", key])
      return result(new Blob([new Uint8Array(size)]))
    },
    upload(key, bytes, options) {
      calls.push(["upload", key, bytes.length, options])
      return result()
    },
    remove(keys) {
      calls.push(["remove", keys])
      return result(null, removeFails ? new Error("storage down") : null)
    },
  }
  const admin = {
    storage: { from: () => bucket },
    from: () => chain,
    rpc(name, args) {
      calls.push([name, args])
      return result(
        name === "claim_media"
          ? {
              status: ready ? "ready" : "processing",
              expected_bytes: 3,
              object_key: OWNER + "/" + ASSET + "/original",
              mime_type: "image/png",
            }
          : null,
      )
    },
  }
  return {
    calls,
    dependencies: {
      origins: [origin],
      userClient: () => ({
        auth: {
          getUser: () =>
            result({ user: user ? { id: user, email_confirmed_at: "2026-10-15" } : null }),
        },
        rpc: () => result(),
      }),
      adminClient: () => {
        calls.push(["admin"])
        return admin
      },
      decode: () => {
        calls.push(["decode"])
        if (decodeFails) throw new Error("decoder internals")
        return { bytes: new Uint8Array([1, 2]), width: 2, height: 1 }
      },
    },
  }
}
function request(body, headers = {}) {
  return new Request("https://project.test/functions/v1/cloud-media", {
    method: "POST",
    headers: {
      Origin: origin,
      Authorization: "Bearer user-jwt",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

test("readiness verifies the user and initializes WASM without creating an admin client", async () => {
  const f = fixture()
  let prepared = false
  f.dependencies.prepare = () => {
    prepared = true
  }
  const response = await handleMediaRequest(request({ action: "status" }), f.dependencies)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ready: true })
  assert.equal(prepared, true)
  assert.equal(
    f.calls.some((call) => call[0] === "admin"),
    false,
  )
})
test("rejects missing/invalid auth and disallowed origins before admin access", async () => {
  for (const [req, expected, options] of [
    [request({ action: "cleanup" }, { Authorization: "" }), 401, {}],
    [request({ action: "cleanup" }), 401, { user: null }],
    [request({ action: "cleanup" }, { Origin: "https://attacker.test" }), 403, {}],
  ]) {
    const f = fixture(options)
    const response = await handleMediaRequest(req, f.dependencies)
    assert.equal(response.status, expected)
    assert.equal(f.calls.length, 0)
  }
})
test("finalizes only after identity-derived claim, real decoding and immutable WebP upload", async () => {
  const f = fixture()
  const r = await handleMediaRequest(
    request({ action: "finalize", assetId: ASSET, ownerId: "spoof" }),
    f.dependencies,
  )
  assert.equal(r.status, 200)
  assert.equal(r.headers.get("Cache-Control"), "no-store")
  assert.deepEqual(f.calls.find((call) => call[0] === "claim_media")[1], {
    p_id: ASSET,
    p_owner: OWNER,
  })
  const upload = f.calls.find((call) => call[0] === "upload")
  assert.equal(upload[1], `${OWNER}/${ASSET}/display.webp`)
  assert.equal(upload[3].upsert, false)
  assert.ok(
    f.calls.findIndex((call) => call[0] === "decode") <
      f.calls.findIndex((call) => call[0] === "finish_media"),
  )
})
test("invalid bytes or dishonest lengths never become ready; failure is queued without exposing details", async () => {
  for (const options of [{ decodeFails: true }, { size: 4 }]) {
    const f = fixture(options)
    const r = await handleMediaRequest(
      request({ action: "finalize", assetId: ASSET }),
      f.dependencies,
    )
    assert.equal(r.status, 400)
    assert.deepEqual(await r.json(), { error: "media_operation_failed" })
    assert.equal(
      f.calls.some((call) => call[0] === "finish_media"),
      false,
    )
    assert.equal(
      f.calls.some((call) => call[0] === "fail_media"),
      true,
    )
  }
})
test("ready-image retries are idempotent and do not decode or overwrite", async () => {
  const f = fixture({ ready: true })
  const r = await handleMediaRequest(
    request({ action: "finalize", assetId: ASSET }),
    f.dependencies,
  )
  assert.equal(r.status, 200)
  assert.equal(
    f.calls.some((call) => call[0] === "download" || call[0] === "upload"),
    false,
  )
})
test("cleanup never releases quota if storage removal fails", async () => {
  const f = fixture({ removeFails: true })
  const r = await handleMediaRequest(request({ action: "cleanup" }), f.dependencies)
  assert.equal(r.status, 400)
  assert.equal(
    f.calls.some((call) => call[0] === "update" || call[0] === "reconcile_media_cleanup"),
    false,
  )
})
test("malformed and oversized bodies cannot reach privileged operations", async () => {
  for (const req of [
    new Request("https://project.test", {
      method: "POST",
      headers: { Origin: origin, Authorization: "Bearer jwt" },
      body: "{",
    }),
    request({ action: "finalize", assetId: "not-a-uuid" }),
    request({ action: "cleanup", padding: "x".repeat(2048) }),
  ]) {
    const f = fixture()
    const r = await handleMediaRequest(req, f.dependencies)
    assert.ok(r.status === 400 || r.status === 413)
    assert.equal(
      f.calls.some((call) => call[0] === "claim_media" || call[0] === "upload"),
      false,
    )
  }
})
