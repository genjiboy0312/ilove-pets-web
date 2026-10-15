// Dependency injection keeps HTTP/auth/ownership/failure paths executable in Node tests.
// The caller supplies server-only clients; this module never accepts owner IDs from a request.
export async function handleMediaRequest(request, dependencies) {
  const origin = request.headers.get("Origin")
  const allowed = origin !== null && dependencies.origins.includes(origin)
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    ...(allowed
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        }
      : {}),
  }
  const respond = (status, value) => new Response(JSON.stringify(value), { status, headers })
  if (origin !== null && !allowed) return respond(403, { error: "origin_denied" })
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers })
  if (request.method !== "POST") return respond(405, { error: "method_not_allowed" })
  const token = request.headers.get("Authorization")
  if (!token?.startsWith("Bearer ")) return respond(401, { error: "unauthorized" })
  let claimed = false
  let assetId
  let owner
  let admin
  const checked = async (result) => {
    const value = await result
    if (value.error) throw new Error("operation_failed")
    return value.data
  }
  try {
    // Bound the request body even when content-length is absent or dishonest.
    const reader = request.body?.getReader()
    if (!reader) return respond(400, { error: "invalid_request" })
    let body = new Uint8Array(0)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (body.length + value.length > 1024) {
        await reader.cancel()
        return respond(413, { error: "invalid_request" })
      }
      body = new Uint8Array([...body, ...value])
    }
    const payload = JSON.parse(new TextDecoder().decode(body))
    if (!payload || !["finalize", "cleanup", "status"].includes(payload.action))
      return respond(400, { error: "invalid_request" })
    const client = dependencies.userClient(token)
    const auth = await client.auth.getUser()
    if (auth.error || !auth.data.user?.email_confirmed_at)
      return respond(401, { error: "unauthorized" })
    owner = auth.data.user.id
    await checked(client.rpc("ensure_profile"))
    if (payload.action === "status") {
      await dependencies.prepare?.()
      return respond(200, { ready: true })
    }
    admin = dependencies.adminClient()
    const bucket = admin.storage.from("pet-media")
    if (payload.action === "cleanup") {
      const jobs = await checked(
        admin
          .from("cleanup_jobs")
          .select("id, object_key")
          .eq("owner_id", owner)
          .eq("status", "pending")
          .limit(20),
      )
      for (const job of jobs) {
        // Defense in depth: a corrupted queue cannot target a different user's objects.
        if (!job.object_key.startsWith(owner + "/")) throw new Error("invalid_queue")
        await checked(bucket.remove([job.object_key]))
        await checked(
          admin
            .from("cleanup_jobs")
            .update({ status: "done" })
            .eq("id", job.id)
            .eq("owner_id", owner),
        )
      }
      await checked(admin.rpc("reconcile_media_cleanup", { p_owner: owner }))
      return respond(200, { cleaned: jobs.length })
    }
    assetId = payload.assetId
    if (
      typeof assetId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)
    )
      return respond(400, { error: "invalid_request" })
    const asset = await checked(admin.rpc("claim_media", { p_id: assetId, p_owner: owner }))
    if (asset.status === "ready") return respond(200, { assetId })
    claimed = true
    const original = await checked(bucket.download(asset.object_key))
    if (original.size !== Number(asset.expected_bytes) || original.size > 5242880)
      throw new Error("invalid_size")
    const result = await dependencies.decode(
      new Uint8Array(await original.arrayBuffer()),
      asset.mime_type,
    )
    if (result.bytes.length > 5242880) throw new Error("encoded_too_large")
    const displayKey = `${owner}/${assetId}/display.webp`
    await checked(
      bucket.upload(displayKey, result.bytes, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "0",
      }),
    )
    await checked(
      admin.rpc("finish_media", {
        p_id: assetId,
        p_owner: owner,
        p_bytes: result.bytes.length,
        p_width: result.width,
        p_height: result.height,
      }),
    )
    claimed = false
    // The original remains private and charged until post deletion; only normalized WebP is served.
    return respond(200, { assetId })
  } catch {
    if (claimed && admin && owner && assetId) {
      try {
        await checked(admin.rpc("fail_media", { p_id: assetId, p_owner: owner }))
      } catch {
        /* Retain the reservation; operator reconciliation is safer than freeing unconfirmed bytes. */
      }
    }
    return respond(400, { error: "media_operation_failed" })
  }
}
