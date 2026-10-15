import { getSupabaseClient } from "./supabaseClient"

export type AuthMode = "login" | "signup" | "reset" | "password"
export async function submitEmailAuth(
  mode: AuthMode,
  email: string,
  password: string,
): Promise<void> {
  const client = getSupabaseClient()
  if (client === null) throw new Error("unconfigured")
  const callback = new URL("/auth/callback", window.location.origin).href
  const result =
    mode === "login"
      ? await client.auth.signInWithPassword({ email, password })
      : mode === "signup"
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: callback } })
        : mode === "reset"
          ? await client.auth.resetPasswordForEmail(email, {
              redirectTo: new URL("/auth/reset-password", window.location.origin).href,
            })
          : await client.auth.updateUser({ password })
  if (result.error !== null) throw result.error
}
export async function startGoogleSignIn(): Promise<void> {
  const client = getSupabaseClient()
  if (client === null) throw new Error("unconfigured")
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", window.location.origin).href },
  })
  if (error !== null) throw error
}
export async function signOut(): Promise<void> {
  const client = getSupabaseClient()
  if (client === null) return
  const { error } = await client.auth.signOut()
  if (error !== null) throw error
}

// Share the exchange across StrictMode effect replays; code/verifier values stay in memory only.
const exchanges = new Map<string, Promise<boolean>>()
export function completeAuthUrl(url: URL): Promise<boolean> {
  const client = getSupabaseClient()
  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  if (client === null || url.searchParams.has("error") || (!code && !tokenHash))
    return Promise.reject(new Error("invalid_callback"))
  const exchangeKey = `${code ?? tokenHash ?? ""}:${type ?? "code"}`
  const previous = exchanges.get(exchangeKey)
  if (previous !== undefined) return previous
  const action = (async () => {
    if (code !== null) {
      const result = await client.auth.exchangeCodeForSession(code)
      if (result.error !== null) throw result.error
      return url.pathname === "/auth/reset-password"
    }
    if (tokenHash === null || (type !== "signup" && type !== "recovery" && type !== "email"))
      throw new Error("invalid_callback")
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error !== null) throw error
    return type === "recovery"
  })()
  if (exchanges.size >= 10) exchanges.clear()
  exchanges.set(exchangeKey, action)
  return action
}
