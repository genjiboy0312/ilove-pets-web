import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { themePreferenceStorageKey } from "../../theme/themePreference"
import { SettingsRoute } from "./SettingsRoute"

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

describe("SettingsRoute", () => {
  beforeEach(async () => {
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

  it("names the route with a level-one Korean heading and back link", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "설정" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute("href", "/my")
  })

  it("renders the account, notifications, privacy, and service sections", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: "계정" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "알림" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "개인정보 및 보안" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "서비스" })).toBeInTheDocument()
  })

  it("renders accessible theme preference controls", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    const themeGroup = screen.getByRole("group", { name: "테마 설정" })
    const buttons = within(themeGroup).getAllByRole("button")

    expect(buttons.map((button) => button.textContent)).toEqual(["시스템", "라이트", "다크"])
    expect(within(themeGroup).getByRole("button", { name: "시스템" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("switches the active language via the language buttons", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    // Given: the app starts in Korean.
    expect(screen.getByRole("button", { name: "한국어" })).toHaveAttribute("aria-pressed", "true")

    // When: the Japanese language is selected.
    fireEvent.click(screen.getByRole("button", { name: "日本語" }))

    // Then: the language preference is applied and reflected in the UI.
    expect(i18n.resolvedLanguage).toBe("ja")
    expect(screen.getByRole("button", { name: "日本語" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("heading", { level: 1, name: "設定" })).toBeInTheDocument()
  })

  it("applies the dark theme from the settings controls", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    // When: the user chooses dark mode from the settings screen.
    fireEvent.click(screen.getByRole("button", { name: "다크" }))

    // Then: the preference is persisted and applied to the document root.
    expect(localStorage.getItem(themePreferenceStorageKey)).toBe("dark")
    expect(document.documentElement.dataset["theme"]).toBe("dark")
    expect(screen.getByRole("button", { name: "다크" })).toHaveAttribute("aria-pressed", "true")
  })

  it("renders logout and delete account buttons with the UI-only hint", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "계정 삭제" })).toBeInTheDocument()
    expect(screen.getByText("지금은 UI만 제공됩니다.")).toBeInTheDocument()
  })
})
