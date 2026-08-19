import { beforeEach, describe, expect, it } from "vitest"

import {
  applyThemePreference,
  getStoredThemePreference,
  normalizeThemePreference,
  resolveThemePreference,
  themePreferenceStorageKey,
} from "./themePreference"

describe("theme preference primitives", () => {
  beforeEach(() => {
    // Given: each test starts without persisted theme state.
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    document.documentElement.style.colorScheme = ""
  })

  it("parses persisted theme preferences and defaults invalid values to system", () => {
    // Given: storage contains an invalid preference value.
    localStorage.setItem(themePreferenceStorageKey, "solarized")

    // When: the stored preference is read at the browser boundary.
    const preference = getStoredThemePreference(localStorage)

    // Then: the app falls back to the system preference.
    expect(preference).toBe("system")
    expect(normalizeThemePreference("dark")).toBe("dark")
    expect(normalizeThemePreference(null)).toBe("system")
  })

  it("resolves system preference through matchMedia and explicit preferences directly", () => {
    // Given: the operating system currently prefers dark colors.
    const prefersDark = true

    // When: explicit and system preferences are resolved.
    const systemTheme = resolveThemePreference("system", prefersDark)
    const lightTheme = resolveThemePreference("light", prefersDark)

    // Then: system follows the media query while explicit light stays light.
    expect(systemTheme).toBe("dark")
    expect(lightTheme).toBe("light")
  })

  it("applies the resolved theme and color scheme to the document root", () => {
    // Given: the root element and a dark system preference are available.
    const root = document.documentElement

    // When: system mode resolves against the dark media query.
    applyThemePreference(root, "system", true)

    // Then: the root exposes dark theme hooks for CSS and browser controls.
    expect(root.dataset["theme"]).toBe("dark")
    expect(root.style.colorScheme).toBe("dark")
  })
})
