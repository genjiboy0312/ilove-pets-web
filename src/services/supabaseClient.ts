import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

export function validPublicConfiguration(url: string, key: string): boolean {
  try {
    const parsed = new URL(url)
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      return false
    if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true
    const payload = key.split(".")[1]
    if (payload === undefined) return false
    const value: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof value === "object" && value !== null && "role" in value && value.role === "anon"
  } catch {
    return false
  }
}

let client: SupabaseClient | null | undefined
export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client
  const url: unknown = import.meta.env["VITE_SUPABASE_URL"]
  const key: unknown = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]
  if (typeof url !== "string" || typeof key !== "string" || !validPublicConfiguration(url, key)) {
    client = null
    return client
  }
  client = createClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "ilove-pets-auth",
    },
  })
  return client
}
