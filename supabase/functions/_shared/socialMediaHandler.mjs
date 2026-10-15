export async function handleSocialMedia(request, dependencies) {
  const origin = request.headers.get("Origin")
  const headers = {
    "Cache-Control": "private, no-store",
    Vary: "Origin, Authorization",
    "X-Content-Type-Options": "nosniff",
    ...(origin && dependencies.origins.includes(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "authorization, apikey, x-client-info",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        }
      : {}),
  }
  const fail = (status) => new Response(null, { status, headers })
  if (origin && !dependencies.origins.includes(origin)) return fail(403)
  if (request.method === "OPTIONS") return fail(204)
  if (request.method !== "GET") return fail(405)
  const id = new URL(request.url).searchParams.get("asset")
  if (!id || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return fail(400)
  try {
    const authorization = request.headers.get("Authorization")
    const user = dependencies.userClient(authorization)
    if (authorization) {
      const auth = await user.auth.getUser()
      if (auth.error || !auth.data.user?.email_confirmed_at) return fail(401)
    }
    const visible = await user.rpc("social_asset", { p_asset: id })
    if (
      visible.error ||
      typeof visible.data !== "string" ||
      !visible.data.endsWith("/" + id + "/display.webp")
    )
      return fail(404)
    const result = await dependencies.download(visible.data)
    if (result.error || !result.data || result.data.size > 5242880) return fail(404)
    return new Response(result.data, { headers: { ...headers, "Content-Type": "image/webp" } })
  } catch {
    return fail(404)
  }
}
