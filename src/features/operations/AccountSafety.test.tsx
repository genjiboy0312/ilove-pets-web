import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"
import type * as OperationsApi from "./operationsApi"
import { AuthContext } from "../auth/AuthContext"
import { initializeI18n, i18n } from "../../i18n/i18n"
import { AccountSafety } from "./AccountSafety"
const api = vi.hoisted(() => ({
  blockedUsers: vi.fn(() => Promise.resolve([])),
  requestAccountDeletion: vi.fn(() => Promise.resolve()),
}))
vi.mock("./operationsApi", async (original) => ({
  ...(await original<typeof OperationsApi>()),
  ...api,
}))
vi.mock("./cloudExport", () => ({ downloadCloudRecords: vi.fn() }))
beforeEach(async () => {
  vi.clearAllMocks()
  await initializeI18n()
  await i18n.changeLanguage("ko")
})
it("does not request deletion until both confirmations and then acknowledges acceptance", async () => {
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: { id: "owner" } as User,
          status: "ready",
          recovering: false,
          clearRecovery: () => {
            /* No password recovery in this scenario. */
          },
        }}
      >
        <AccountSafety />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  await waitFor(() => {
    expect(api.blockedUsers).toHaveBeenCalled()
  })
  fireEvent.click(screen.getByRole("button", { name: "계정 삭제" }))
  const submit = screen.getByRole("button", { name: "계정 삭제 요청" })
  expect(submit).toBeDisabled()
  fireEvent.click(screen.getByRole("checkbox"))
  expect(submit).toBeDisabled()
  fireEvent.change(screen.getByLabelText("확인을 위해 DELETE 입력"), {
    target: { value: "DELETE" },
  })
  fireEvent.click(submit)
  await waitFor(() => {
    expect(screen.getByRole("status")).toHaveTextContent("삭제 요청을 접수했습니다")
  })
  expect(api.requestAccountDeletion).toHaveBeenCalledExactlyOnceWith("owner")
  expect(screen.queryByRole("button", { name: "계정 삭제 요청" })).not.toBeInTheDocument()
})
