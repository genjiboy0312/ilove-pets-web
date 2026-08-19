import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { BottomNavigation } from "./BottomNavigation"
import { i18n, initializeI18n } from "../i18n/i18n"

function renderBottomNavigationAt(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <BottomNavigation />
    </MemoryRouter>,
  )
}

describe("BottomNavigation", () => {
  beforeEach(async () => {
    // Given: each navigation test starts with initialized Korean resources.
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("renders one labelled navigation with five translated route links", () => {
    // Given: the bottom navigation is rendered at the home route.
    renderBottomNavigationAt()

    // When: assistive technology discovers the navigation landmark and links.
    const navigation = screen.getByRole("navigation", { name: "주요 탐색" })
    const links = within(navigation).getAllByRole("link")

    // Then: route labels are visible text in the required order.
    expect(links.map((link) => link.textContent)).toEqual(["홈", "탐색", "작성", "활동", "마이"])
  })

  it("keeps icons decorative and labels available as accessible names", () => {
    // Given: the activity route is active.
    renderBottomNavigationAt("/activity")

    // When: links and icons are inspected.
    const activityLink = screen.getByRole("link", { name: "활동" })
    const decorativeIcons = document.querySelectorAll(
      ".bottom-navigation__icon[aria-hidden='true']",
    )

    // Then: every icon is hidden from assistive technology and the visible label names the link.
    expect(activityLink).toHaveAttribute("aria-current", "page")
    expect(decorativeIcons).toHaveLength(5)
  })
})
