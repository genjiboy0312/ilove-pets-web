import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { i18n, initializeI18n } from "../../i18n/i18n"
import { AuthContext } from "./AuthContext"
import { AuthRoute } from "./AuthRoute"

const actions = vi.hoisted(() => ({ submitEmailAuth: vi.fn(), startGoogleSignIn: vi.fn() }))
vi.mock("../../services/authActions", () => actions)

describe("auth screens", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    actions.submitEmailAuth.mockResolvedValue(undefined)
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })
  function view(ready = true, recovery = false) {
    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: null,
            status: ready ? "ready" : "unconfigured",
            recovering: false,
            clearRecovery: vi.fn(),
          }}
        >
          <AuthRoute recovery={recovery} />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  }
  it("keeps local mode available when no backend is configured", () => {
    view(false)
    expect(screen.getByRole("button", { name: "Google로 계속" })).toBeDisabled()
    expect(screen.getByLabelText("이메일")).toBeDisabled()
    expect(screen.getByText(/로컬 기능은 계속/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "내 계정으로 돌아가기" })).toHaveAttribute(
      "href",
      "/myaccount",
    )
  })
  it("rejects password mismatch, then sends signup once and clears passwords", async () => {
    view()
    fireEvent.click(screen.getByRole("button", { name: "회원가입" }))
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "a@example.com" } })
    fireEvent.change(screen.getByLabelText("비밀번호", { exact: true }), {
      target: { value: "long-password" },
    })
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
      target: { value: "different-pass" },
    })
    fireEvent.submit(
      screen.getByLabelText("이메일").closest("form") ?? document.createElement("form"),
    )
    expect(actions.submitEmailAuth).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent("비밀번호가 일치하지 않습니다")
    fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: "long-password" } })
    fireEvent.submit(
      screen.getByLabelText("이메일").closest("form") ?? document.createElement("form"),
    )
    await waitFor(() => {
      expect(actions.submitEmailAuth).toHaveBeenCalledWith(
        "signup",
        "a@example.com",
        "long-password",
      )
    })
    await waitFor(() => expect(screen.getByLabelText("비밀번호", { exact: true })).toHaveValue(""))
  })
  it("requires a recovery session before updating a password", () => {
    view(true, true)
    expect(screen.getByRole("button", { name: "새 비밀번호 저장" })).toBeDisabled()
    expect(actions.submitEmailAuth).not.toHaveBeenCalled()
  })
})
