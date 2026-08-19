import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { App } from "./App"
import { i18n, initializeI18n } from "./i18n/i18n"
import { themePreferenceStorageKey } from "./theme/themePreference"

class ControllableMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media = "(prefers-color-scheme: dark)"
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null = null
  matches = false

  addListener(callback: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null): void {
    void callback
  }

  removeListener(
    callback: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null,
  ): void {
    void callback
  }
}

describe("App Stage 3 runtime shell", () => {
  beforeEach(async () => {
    // Given: each App test starts from Korean copy, clean storage, and a clean root theme.
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    document.documentElement.style.colorScheme = ""
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => new ControllableMediaQueryList(),
      writable: true,
    })
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("exposes one primary main landmark", () => {
    // Given: the Stage 3 app shell is rendered.
    render(<App />)

    // When: assistive technology discovers page landmarks.
    const mainLandmarks = screen.getAllByRole("main", { name: "iLove Pets 앱 셸" })

    // Then: exactly one primary content landmark is available.
    expect(mainLandmarks).toHaveLength(1)
  })

  it("names the app with a level-one heading", () => {
    // Given: the Stage 3 app shell is rendered.
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
    // Given: the Stage 3 app shell is rendered.
    render(<App />)

    // When: status content is discovered by semantic role.
    const status = screen.getByRole("status")

    // Then: the readiness message is available in a polite live region.
    expect(status).toHaveAttribute("aria-live", "polite")
    expect(status).toHaveTextContent("프론트엔드 기반 준비 완료")
  })

  it("renders accessible Korean theme preference controls", () => {
    // Given: the Stage 3 translated app shell is rendered.
    render(<App />)

    // When: theme preference controls are discovered by their labelled group.
    const themeGroup = screen.getByRole("group", { name: "테마 설정" })
    const buttons = within(themeGroup).getAllByRole("button")

    // Then: all preferences are visible real buttons with the system option selected by default.
    expect(buttons.map((button) => button.textContent)).toEqual(["시스템", "라이트", "다크"])
    expect(within(themeGroup).getByRole("button", { name: "시스템" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("persists dark preference and applies the dark root theme", () => {
    // Given: the Stage 3 app is rendered with default system preference.
    render(<App />)

    // When: the user chooses dark mode.
    fireEvent.click(screen.getByRole("button", { name: "다크" }))

    // Then: the selected preference is stored and exposed on the document root.
    expect(localStorage.getItem(themePreferenceStorageKey)).toBe("dark")
    expect(document.documentElement.dataset["theme"]).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(screen.getByRole("button", { name: "다크" })).toHaveAttribute("aria-pressed", "true")
  })

  it("persists system preference when returning from an explicit theme", () => {
    // Given: the user has already selected dark mode in the rendered app.
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "다크" }))

    // When: the user returns to system mode.
    fireEvent.click(screen.getByRole("button", { name: "시스템" }))

    // Then: system mode is persisted and announced as selected.
    expect(localStorage.getItem(themePreferenceStorageKey)).toBe("system")
    expect(screen.getByRole("button", { name: "시스템" })).toHaveAttribute("aria-pressed", "true")
  })

  it("lists the foundation areas covered by the scaffold", () => {
    // Given: the Stage 3 app shell is rendered.
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
