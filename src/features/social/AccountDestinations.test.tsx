import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"
import { AuthContext } from "../auth/AuthContext"
import type { AuthState } from "../auth/AuthContext"
import { initializeI18n, i18n } from "../../i18n/i18n"
import { AccountDestinations } from "./AccountDestinations"

vi.mock("./ProfilePanel", () => ({ OwnProfile: () => <h2>Account profile</h2> }))
vi.mock("./Stories", () => ({ Stories: () => null }))
vi.mock("../import/ImportHistory", () => ({ ImportHistory: () => null }))
vi.mock("../cloud/CloudWorkspace", () => ({ CloudWorkspace: () => null }))
const guest: AuthState = { user: null, status: "ready", recovering: false, clearRecovery: vi.fn() }
function View({ auth = guest }: { readonly auth?: AuthState }) {
  return (
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <AccountDestinations>
          <h2>Device records</h2>
        </AccountDestinations>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
describe("account entry", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })
  it("hides management until a guest explicitly chooses device records", () => {
    render(<View />)
    expect(screen.getByRole("button", { name: "Google로 계속" })).toBeEnabled()
    expect(screen.getByRole("link", { name: "이메일로 로그인" })).toHaveAttribute("href", "/auth")
    expect(screen.queryByText("Device records")).not.toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "저장 위치" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "로그인 없이 기기 기록 사용하기" }))
    expect(screen.getByText("Device records")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "로그인 안내로 돌아가기" }))
    expect(screen.queryByText("Device records")).not.toBeInTheDocument()
  })
  it("shows only a loading state while checking the session", () => {
    render(<View auth={{ ...guest, status: "loading" }} />)
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Device records")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Google로 계속" })).not.toBeInTheDocument()
  })
  it("switches to the account dashboard on sign-in and hides it on sign-out", () => {
    const view = render(<View />)
    view.rerender(
      <View auth={{ ...guest, user: { id: "owner", email: "test@example.invalid" } as User }} />,
    )
    expect(screen.getByText("Account profile")).toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "우리 아이의 기록을 한곳에" }),
    ).not.toBeInTheDocument()
    view.rerender(<View />)
    expect(screen.queryByText("Account profile")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "로그인 없이 기기 기록 사용하기" }),
    ).toBeInTheDocument()
  })
})
