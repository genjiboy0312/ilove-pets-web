import { describe, expect, it } from "vitest"
import { validPublicConfiguration } from "./supabaseClient"

describe("public Supabase configuration", () => {
  it("accepts only HTTPS endpoints and public keys", () => {
    expect(validPublicConfiguration("https://project.supabase.co", "sb_publishable_test")).toBe(
      true,
    )
    expect(validPublicConfiguration("http://project.supabase.co", "sb_publishable_test")).toBe(
      false,
    )
    expect(
      validPublicConfiguration("https://user:secret@project.supabase.co", "sb_publishable_test"),
    ).toBe(false)
    expect(
      validPublicConfiguration("https://project.supabase.co?token=secret", "sb_publishable_test"),
    ).toBe(false)
    expect(validPublicConfiguration("https://project.supabase.co", "sb_secret_test")).toBe(false)
  })
  it("rejects legacy privileged JWTs while accepting anon keys", () => {
    const jwt = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`
    expect(validPublicConfiguration("https://project.supabase.co", jwt("anon"))).toBe(true)
    expect(validPublicConfiguration("https://project.supabase.co", jwt("service_role"))).toBe(false)
    expect(validPublicConfiguration("https://project.supabase.co", "broken")).toBe(false)
  })
})
