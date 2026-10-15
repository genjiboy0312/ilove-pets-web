import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"
import { i18n, initializeI18n } from "../../i18n/i18n"
import { ActivityRoute } from "./ActivityRoute"

describe("ActivityRoute", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })
  it("names the route and directs guests to sign in without showing demo activity", () => {
    render(
      <MemoryRouter>
        <ActivityRoute />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { level: 1, name: "활동" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "로그인하고 참여하기" })).toHaveAttribute(
      "href",
      "/auth",
    )
    expect(screen.queryByText(/Arden Lee/)).not.toBeInTheDocument()
  })
})
