import { test } from "node:test"
import assert from "node:assert/strict"
import {
  handleAccountOperations,
  handleMaintenance,
} from "../../supabase/functions/_shared/operationsHandler.mjs"
import { runCleanup, runMaintenance } from "../../supabase/functions/_shared/operationsJobs.mjs"
const owner = "00000000-0000-0000-0000-000000000001",
  asset = "10000000-0000-0000-0000-000000000001",
  now = 1800000000
const jwt = (amr, iat = now) =>
  "header." +
  Buffer.from(JSON.stringify({ sub: owner, amr, iat })).toString("base64url") +
  ".signature"
const makeRequest = (token, body = { action: "delete_account", confirm: "DELETE" }) =>
  new Request("https://example.invalid", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
function deps() {
  const calls = []
  return {
    calls,
    origins: [],
    now: () => now * 1000,
    userClient: () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: owner, email_confirmed_at: "2026-10-15" } },
          error: null,
        }),
      },
    }),
    adminClient: () => {
      calls.push("admin")
      return {
        rpc: async (name, args) => {
          calls.push({ name, args })
          return { data: "job", error: null }
        },
        auth: { admin: { signOut: async () => ({ error: null }) } },
      }
    },
  }
}
test("deletion requires recent original AMR authentication rather than refreshed iat", async () => {
  const d = deps()
  const old = await handleAccountOperations(
    makeRequest(jwt([{ method: "password", timestamp: now - 3600 }])),
    d,
  )
  assert.equal(old.status, 403)
  assert.equal((await old.json()).error, "reauthentication_required")
  assert.deepEqual(d.calls, [])
  assert.equal(
    (
      await handleAccountOperations(
        makeRequest(jwt([{ method: "token_refresh", timestamp: now }])),
        d,
      )
    ).status,
    403,
  )
})
test("deletion ignores supplied owner, requires confirmation and verifies Auth before privilege", async () => {
  const d = deps(),
    token = jwt([{ method: "oauth", timestamp: now - 10 }])
  assert.equal(
    (
      await handleAccountOperations(
        makeRequest(token, { action: "delete_account", confirm: "NO" }),
        d,
      )
    ).status,
    400,
  )
  assert.deepEqual(d.calls, [])
  const response = await handleAccountOperations(
    makeRequest(token, { action: "delete_account", confirm: "DELETE", owner: "spoof" }),
    d,
  )
  assert.equal(response.status, 202)
  assert.equal(d.calls[1].args.p_owner, owner)
  const forged = deps()
  forged.userClient = () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: {} }) },
  })
  assert.equal((await handleAccountOperations(makeRequest(token), forged)).status, 401)
  assert.deepEqual(forged.calls, [])
})
test("oversized bodies and denied origins never reach privileged deletion", async () => {
  const d = deps(),
    token = jwt([{ method: "password", timestamp: now }])
  assert.equal(
    (
      await handleAccountOperations(
        makeRequest(token, {
          action: "delete_account",
          confirm: "DELETE",
          extra: "x".repeat(2000),
        }),
        d,
      )
    ).status,
    400,
  )
  const req = makeRequest(token)
  req.headers.set("Origin", "https://evil.invalid")
  assert.equal((await handleAccountOperations(req, d)).status, 403)
  assert.deepEqual(d.calls, [])
})
test("maintenance rejects missing or wrong secrets before constructing an admin client", async () => {
  const d = deps()
  d.secret = "a".repeat(48)
  assert.equal(
    (
      await handleMaintenance(
        new Request("https://example.invalid", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
        }),
        d,
      )
    ).status,
    401,
  )
  assert.deepEqual(d.calls, [])
})
test("cleanup failures are persisted for retry and corrupted owner prefixes are never removed", async () => {
  const calls = [],
    jobs = [
      {
        id: "job",
        owner_id: owner,
        object_key: owner + "/" + asset + "/original",
        lease_token: "lease",
      },
    ]
  const admin = {
    rpc: async (name, args) => {
      calls.push({ name, args })
      return { data: name === "ops_claim_cleanup" ? jobs : true, error: null }
    },
    storage: { from: () => ({ remove: async () => ({ error: { code: "storage_failed" } }) }) },
  }
  assert.deepEqual(await runCleanup(admin), { cleaned: 0, failed: 1 })
  assert.equal(calls[1].args.p_success, false)
  jobs[0].object_key = "foreign/" + asset + "/original"
  let removed = false
  admin.storage.from = () => ({
    remove: async () => {
      removed = true
      return { data: null, error: null }
    },
  })
  await runCleanup(admin)
  assert.equal(removed, false)
})
test("Auth deletion failures remain retryable, and an already removed user completes idempotently", async () => {
  const results = []
  let deleted = false
  const admin = {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: "run" }, error: null }) }),
      }),
      update: () => ({ eq: async () => ({ data: null, error: null }) }),
    }),
    rpc: async (name, args) => {
      if (name === "ops_claim_cleanup") return { data: [], error: null }
      if (name === "ops_claim_deletions")
        return { data: [{ id: "job", owner_id: owner, lease_token: "token" }], error: null }
      if (name === "ops_finish_deletion") results.push(args)
      return { data: null, error: null }
    },
    storage: { from: () => ({ list: async () => ({ data: [], error: null }) }) },
    auth: {
      admin: { deleteUser: async () => ({ error: deleted ? { status: 404 } : { status: 503 } }) },
    },
  }
  assert.equal((await runMaintenance(admin)).failed, 1)
  assert.equal(results[0].p_success, false)
  deleted = true
  assert.equal((await runMaintenance(admin)).deleted, 1)
  assert.equal(results[1].p_success, true)
})
