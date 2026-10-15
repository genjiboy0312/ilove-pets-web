import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
  },
}))
vi.mock("./supabaseClient", () => ({ getSupabaseClient: () => mocks }))
import { completeAuthUrl, signOut, startGoogleSignIn, submitEmailAuth } from "./authActions"

describe("auth actions", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks.auth))
      mock.mockReset().mockResolvedValue({ error: null })
  })
  it("routes email signup and recovery back to this app", async () => {
    await submitEmailAuth("signup", "a@example.com", "long-password")
    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "long-password",
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    await submitEmailAuth("reset", "a@example.com", "")
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith("a@example.com", {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  })
  it("supports Google, password login, update and signout", async () => {
    await startGoogleSignIn()
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    await submitEmailAuth("login", "a@example.com", "password")
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@example.com",
      password: "password",
    })
    await submitEmailAuth("password", "", "new-password")
    expect(mocks.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" })
    localStorage.setItem("local-pet", "keep")
    await signOut()
    expect(localStorage.getItem("local-pet")).toBe("keep")
  })
  it("exchanges a PKCE code only once across effect replays", async () => {
    const url = new URL("https://app.test/auth/callback?code=strict-mode")
    const results = await Promise.all([completeAuthUrl(url), completeAuthUrl(url)])
    expect(results).toEqual([false, false])
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })
  it("accepts recovery hashes but rejects unexpected OTP types and expired codes", async () => {
    await expect(
      completeAuthUrl(
        new URL("https://app.test/auth/reset-password?token_hash=recovery-one&type=recovery"),
      ),
    ).resolves.toBe(true)
    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: "recovery-one",
      type: "recovery",
    })
    await expect(
      completeAuthUrl(new URL("https://app.test/auth/callback?token_hash=bad&type=invite")),
    ).rejects.toThrow()
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ error: new Error("expired") })
    await expect(
      completeAuthUrl(new URL("https://app.test/auth/callback?code=expired-one")),
    ).rejects.toThrow("expired")
    await expect(
      completeAuthUrl(new URL("https://app.test/auth/callback?error=denied")),
    ).rejects.toThrow()
  })
})
