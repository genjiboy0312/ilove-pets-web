import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { App } from "./App"

describe("App Stage 1 shell", () => {
  it("exposes one primary main landmark", () => {
    // Given: the Stage 1 app shell is rendered.
    render(<App />)

    // When: assistive technology discovers page landmarks.
    const mainLandmarks = screen.getAllByRole("main")

    // Then: exactly one primary content landmark is available.
    expect(mainLandmarks).toHaveLength(1)
  })

  it("names the app with a level-one heading", () => {
    // Given: the Stage 1 app shell is rendered.
    render(<App />)

    // When: the primary heading is queried by accessible name.
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "iLove Pets",
    })

    // Then: the app identity is exposed as the page title.
    expect(heading).toBeInTheDocument()
  })

  it("announces scaffold readiness through a polite status region", () => {
    // Given: the Stage 1 app shell is rendered.
    render(<App />)

    // When: status content is discovered by semantic role.
    const status = screen.getByRole("status")

    // Then: the readiness message is available in a polite live region.
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status).toHaveTextContent("프론트엔드 기반 준비 완료")
  })

  it("lists the foundation areas covered by the scaffold", () => {
    // Given: the Stage 1 app shell is rendered.
    render(<App />)

    // When: scaffold areas are read from the semantic list.
    const list = screen.getByRole("list")
    const itemText = within(list)
      .getAllByRole("listitem")
      .map((item) => item.textContent)

    // Then: the list communicates the implementation foundations, not mock data.
    expect(itemText).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/React\/Vite/i),
        expect.stringMatching(/theme tokens/i),
        expect.stringMatching(/i18n readiness/i),
        expect.stringMatching(/routing readiness/i),
      ]),
    )
  })
})
