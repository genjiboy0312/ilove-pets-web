import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { themePreferenceStorageKey } from "./themePreference"
import { useThemePreference } from "./useThemePreference"

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

  setMatches(matches: boolean): void {
    this.matches = matches
    this.dispatchEvent(new Event("change"))
  }
}

describe("useThemePreference", () => {
  let mediaQueryList: ControllableMediaQueryList

  beforeEach(() => {
    // Given: each hook test starts with a clean root, clean storage, and controllable system theme.
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    document.documentElement.style.colorScheme = ""
    mediaQueryList = new ControllableMediaQueryList()
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => mediaQueryList,
      writable: true,
    })
  })

  it("persists dark preference and applies the root theme", () => {
    // Given: the preference hook is mounted in system mode.
    const { result } = renderHook(() => useThemePreference())

    // When: the user chooses dark mode.
    act(() => {
      result.current.setPreference("dark")
    })

    // Then: storage and the document root both reflect dark mode.
    expect(result.current.preference).toBe("dark")
    expect(localStorage.getItem(themePreferenceStorageKey)).toBe("dark")
    expect(document.documentElement.dataset["theme"]).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
  })

  it("subscribes to system changes only while system preference is active", () => {
    // Given: the preference hook is mounted with system mode active.
    const { result } = renderHook(() => useThemePreference())

    // When: the system switches to dark and then the user chooses light.
    act(() => {
      mediaQueryList.setMatches(true)
    })
    act(() => {
      result.current.setPreference("light")
    })
    act(() => {
      mediaQueryList.setMatches(false)
    })

    // Then: system changes no longer override the explicit light choice.
    expect(result.current.preference).toBe("light")
    expect(document.documentElement.dataset["theme"]).toBe("light")
    expect(document.documentElement.style.colorScheme).toBe("light")
  })
})
