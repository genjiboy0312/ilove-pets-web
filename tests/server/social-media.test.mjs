import { test } from "node:test"
import assert from "node:assert/strict"
import { handleSocialMedia } from "../../supabase/functions/_shared/socialMediaHandler.mjs"
const id = "00000000-0000-0000-0000-000000000001"
const origin = "https://ilove-pets-web.pages.dev"
function fixture(key = null, valid = true) {
  const calls = []
  return {
    calls,
    dependencies: {
      origins: [origin],
      userClient: () => ({
        auth: {
          getUser: async () => ({
            data: { user: valid ? { email_confirmed_at: "now" } : null },
            error: null,
          }),
        },
        rpc: async () => ({ data: key, error: null }),
      }),
      download: async (path) => {
        calls.push(path)
        return { data: new Blob(["webp"], { type: "image/webp" }), error: null }
      },
    },
  }
}
test("hidden/private/expired assets never reach privileged storage", async () => {
  const f = fixture()
  const r = await handleSocialMedia(new Request("https://x.test?asset=" + id), f.dependencies)
  assert.equal(r.status, 404)
  assert.deepEqual(f.calls, [])
})
test("visible projection serves only canonical image bytes without caching or signed URLs", async () => {
  const f = fixture(id + "/" + id + "/display.webp")
  const r = await handleSocialMedia(
    new Request("https://x.test?asset=" + id, { headers: { Origin: origin } }),
    f.dependencies,
  )
  assert.equal(r.status, 200)
  assert.equal(r.headers.get("Content-Type"), "image/webp")
  assert.match(r.headers.get("Cache-Control"), /no-store/)
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), origin)
  assert.equal(await r.text(), "webp")
})
test("bad identity, unexpected origins and original object keys are rejected", async () => {
  for (const [f, headers, status] of [
    [fixture(id + "/" + id + "/display.webp", false), { Authorization: "Bearer bad" }, 401],
    [fixture(), { Origin: "https://bad.test" }, 403],
    [fixture(id + "/" + id + "/original"), {}, 404],
  ]) {
    const r = await handleSocialMedia(
      new Request("https://x.test?asset=" + id, { headers }),
      f.dependencies,
    )
    assert.equal(r.status, status)
    assert.deepEqual(f.calls, [])
  }
})
