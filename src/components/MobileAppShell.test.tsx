import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MobileAppShell } from "./MobileAppShell"

describe("MobileAppShell", () => {
  it("renders one labelled main landmark", () => {
    // Given: shell labels and child content are provided.
    render(
      <MobileAppShell mainLabel="iLove Pets 앱 셸">
        <section aria-label="준비 카드">준비 완료</section>
      </MobileAppShell>,
    )

    // When: the primary content landmark is discovered by assistive technology.
    const main = screen.getByRole("main", { name: "iLove Pets 앱 셸" })

    // Then: the app exposes exactly one primary content landmark.
    expect(main).toHaveTextContent("준비 완료")
    expect(screen.getAllByRole("main")).toHaveLength(1)
  })

  it("renders optional bottom navigation outside the main content", () => {
    // Given: the shell receives a bottom navigation landmark.
    render(
      <MobileAppShell
        bottomNavigation={<nav aria-label="주요 탐색">탐색</nav>}
        mainLabel="iLove Pets 앱 셸"
      >
        <section aria-label="준비 카드">준비 완료</section>
      </MobileAppShell>,
    )

    // When: primary content and bottom navigation are queried separately.
    const main = screen.getByRole("main", { name: "iLove Pets 앱 셸" })
    const navigation = screen.getByRole("navigation", { name: "주요 탐색" })

    // Then: navigation is outside the main while the shell preserves one main landmark.
    expect(main).not.toContainElement(navigation)
    expect(navigation.closest("div")).toHaveClass("app-canvas")
    expect(screen.getAllByRole("main")).toHaveLength(1)
  })
})
