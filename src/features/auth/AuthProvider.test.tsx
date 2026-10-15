import { act, render, screen, waitFor } from "@testing-library/react"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider } from "./AuthProvider"
import { useAuth } from "./AuthContext"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}))
vi.mock("../../services/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: mocks.subscribe,
    },
  }),
}))
function user(id: string): User {
  return {
    id,
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-10-14T00:00:00Z",
  }
}
function session(id: string): Session {
  return {
    access_token: "test",
    refresh_token: "test",
    expires_in: 3600,
    token_type: "bearer",
    user: user(id),
  }
}
function Probe() {
  const auth = useAuth()
  return <p>{`${auth.status}:${auth.user?.id ?? "none"}:${String(auth.recovering)}`}</p>
}
describe("auth session transitions", () => {
  let listener: (event: AuthChangeEvent, session: Session | null) => void
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.getUser.mockResolvedValue({ data: { user: user("A") }, error: null })
    mocks.subscribe.mockImplementation((callback: typeof listener) => {
      listener = callback
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
    })
  })
  it("switches A to signed-out to B and cleans up its listener", async () => {
    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByText("ready:none:false")
    act(() => {
      listener("SIGNED_IN", session("A"))
    })
    expect(screen.getByText("ready:A:false")).toBeInTheDocument()
    act(() => {
      listener("PASSWORD_RECOVERY", session("A"))
    })
    expect(screen.getByText("ready:A:true")).toBeInTheDocument()
    act(() => {
      listener("SIGNED_OUT", null)
    })
    expect(screen.getByText("ready:none:false")).toBeInTheDocument()
    act(() => {
      listener("SIGNED_IN", session("B"))
    })
    expect(screen.getByText("ready:B:false")).toBeInTheDocument()
    view.unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })
  it("validates a restored session using getUser", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("A") }, error: null })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByText("ready:A:false")
    expect(mocks.getUser).toHaveBeenCalledOnce()
  })
  it("does not overwrite a newer sign-in when old initialization resolves", async () => {
    let resolveSession: ((value: { data: { session: null }; error: null }) => void) | undefined
    mocks.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve
        }),
    )
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    act(() => {
      listener("SIGNED_IN", session("B"))
    })
    await act(async () => {
      resolveSession?.({ data: { session: null }, error: null })
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.getByText("ready:B:false")).toBeInTheDocument()
    })
  })
})
