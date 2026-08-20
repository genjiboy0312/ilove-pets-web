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
    expect(screen.getByRole("link", { name: "뒤로" })).toHaveAttribute("href", "/myaccount")
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

  it("toggles notification preferences and persists them to storage", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    // Given: notification switches start enabled by default.
    const likesSwitch = screen.getByRole("switch", { name: "좋아요 켜짐" })

    expect(likesSwitch).toHaveAttribute("aria-checked", "true")

    // When: the user turns off the likes notification.
    fireEvent.click(likesSwitch)

    // Then: the switch reflects the new state and the preference is persisted.
    expect(screen.getByRole("switch", { name: "좋아요 꺼짐" })).toHaveAttribute(
      "aria-checked",
      "false",
    )
    expect(localStorage.getItem("ilove-pets-web:notification-preferences")).toContain(
      '"likes":false',
    )
  })

  it("opens the privacy policy sheet from the privacy section", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    // When: the user activates the privacy policy item from the privacy section.
    const privacySection = screen.getByRole("region", { name: "개인정보 및 보안" })

    fireEvent.click(within(privacySection).getByRole("button", { name: "개인정보 처리방침" }))

    // Then: a dialog opens with the policy content and a close control.
    const dialog = screen.getByRole("dialog", { name: "개인정보 처리방침" })

    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/개인정보 처리방침은/)).toBeInTheDocument()
  })

  it("opens the terms and about sheets from the service section", () => {
    render(
      <MemoryRouter>
        <SettingsRoute />
      </MemoryRouter>,
    )

    // When: the user activates the terms item.
    fireEvent.click(screen.getByRole("button", { name: "이용약관" }))

    // Then: the terms dialog opens with its body content.
    const termsDialog = screen.getByRole("dialog", { name: "이용약관" })

    expect(termsDialog).toBeInTheDocument()
    expect(within(termsDialog).getByText(/본 이용약관은/)).toBeInTheDocument()

    // When: the dialog is closed and the about item is activated.
    fireEvent.click(within(termsDialog).getByRole("button", { name: "닫기" }))
    fireEvent.click(screen.getByRole("button", { name: "정보" }))

    // Then: the about dialog opens with its body content.
    const aboutDialog = screen.getByRole("dialog", { name: "정보" })

    expect(aboutDialog).toBeInTheDocument()
    expect(within(aboutDialog).getByText(/iLove Pets는/)).toBeInTheDocument()
  })
})
