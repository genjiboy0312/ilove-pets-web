import { checked, runMaintenance } from "./operationsJobs.mjs"
async function limitedJson(request) {
  const reader = request.body?.getReader()
  if (!reader) throw new Error("invalid")
  let text = "",
    length = 0
  const decoder = new TextDecoder()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.length
    if (length > 1024) {
      await reader.cancel()
      throw new Error("invalid")
    }
    text += decoder.decode(value, { stream: true })
  }
  return JSON.parse(text + decoder.decode())
}
export async function handleAccountOperations(request, deps) {
  const origin = request.headers.get("Origin")
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    ...(origin && deps.origins.includes(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        }
      : {}),
  }
  const respond = (status, body) => new Response(JSON.stringify(body), { status, headers })
  if (origin && !deps.origins.includes(origin)) return respond(403, { error: "origin_denied" })
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers })
  if (request.method !== "POST") return respond(405, { error: "method_not_allowed" })
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "")
  if (!token) return respond(401, { error: "unauthorized" })
  try {
    let payload
    try {
      payload = await limitedJson(request)
    } catch {
      return respond(400, { error: "invalid_request" })
    }
    if (payload?.action !== "delete_account" || payload.confirm !== "DELETE")
      return respond(400, { error: "confirmation_required" })
    const auth = await deps.userClient(token).auth.getUser(token)
    if (auth.error || !auth.data.user?.email_confirmed_at)
      return respond(401, { error: "unauthorized" })
    // Read AMR only after Auth has verified this exact JWT. Refresh iat is not reauthentication.
    const claims = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")))
    const now = Math.floor((deps.now?.() ?? Date.now()) / 1000)
    if (
      claims.sub !== auth.data.user.id ||
      !Array.isArray(claims.amr) ||
      !claims.amr.some(
        (item) =>
          ["password", "oauth", "otp", "totp"].includes(item.method) &&
          Number.isFinite(item.timestamp) &&
          item.timestamp <= now + 30 &&
          item.timestamp >= now - 600,
      )
    )
      return respond(403, { error: "reauthentication_required" })
    const admin = deps.adminClient()
    const jobId = await checked(
      admin.rpc("ops_begin_account_deletion", { p_owner: auth.data.user.id }),
    )
    // Already-issued JWTs are also denied by account_state and Storage/RPC policies.
    await admin.auth.admin.signOut(token, "global").catch(() => undefined)
    return respond(202, { status: "accepted", jobId })
  } catch {
    return respond(503, { error: "operation_unavailable" })
  }
}
export async function handleMaintenance(request, deps) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" }
  const respond = (status, value) => new Response(JSON.stringify(value), { status, headers })
  if (request.method !== "POST") return respond(405, { error: "method_not_allowed" })
  const supplied = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? ""
  if (!deps.secret || deps.secret.length < 32 || supplied.length > 200)
    return respond(401, { error: "unauthorized" })
  const hash = async (value) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))
  const [a, b] = await Promise.all([hash(supplied), hash(deps.secret)])
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i]
  if (mismatch) return respond(401, { error: "unauthorized" })
  try {
    return respond(200, await runMaintenance(deps.adminClient()))
  } catch {
    return respond(503, { error: "operation_unavailable" })
  }
}
