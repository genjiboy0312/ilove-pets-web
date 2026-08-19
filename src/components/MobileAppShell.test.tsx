import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MobileAppShell } from "./MobileAppShell"

describe("MobileAppShell", () => {
  it("renders a semantic banner and one labelled main landmark", () => {
    // Given: shell labels and child content are provided.
    render(
      <MobileAppShell bannerLabel="앱 준비 상태" mainLabel="iLove Pets 앱 셸">
        <section aria-label="준비 카드">준비 완료</section>
      </MobileAppShell>,
    )

    // When: landmarks are discovered by assistive technology.
    const banner = screen.getByRole("banner", { name: "앱 준비 상태" })
    const main = screen.getByRole("main", { name: "iLove Pets 앱 셸" })

    // Then: the app exposes shell structure without extra primary landmarks.
    expect(banner).toBeInTheDocument()
    expect(main).toHaveTextContent("준비 완료")
    expect(screen.getAllByRole("main")).toHaveLength(1)
  })

  it("keeps optional header controls outside the main content", () => {
    // Given: the shell receives a compact header control group.
    render(
      <MobileAppShell
        bannerLabel="App readiness"
        headerControls={<div role="group" aria-label="Theme preference" />}
        mainLabel="iLove Pets app shell"
      >
        <p>Ready</p>
      </MobileAppShell>,
    )

    // When: controls and primary content are queried separately.
    const controls = screen.getByRole("group", { name: "Theme preference" })
    const main = screen.getByRole("main", { name: "iLove Pets app shell" })

    // Then: controls stay in the banner and no navigation landmark is introduced.
    expect(controls.closest("header")).toBe(screen.getByRole("banner"))
    expect(main).not.toContainElement(controls)
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
  })
})
