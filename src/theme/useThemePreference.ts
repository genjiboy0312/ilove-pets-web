import { useCallback, useEffect, useState } from "react"

import {
  applyThemePreference,
  getStoredThemePreference,
  storeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "./themePreference"

const systemDarkQuery = "(prefers-color-scheme: dark)"

export interface ThemePreferenceState {
  readonly preference: ThemePreference
  readonly resolvedTheme: ResolvedTheme
  readonly setPreference: (preference: ThemePreference) => void
}

export function useThemePreference(): ThemePreferenceState {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    getStoredThemePreference(window.localStorage),
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    window.matchMedia(systemDarkQuery).matches ? "dark" : "light",
  )

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    storeThemePreference(window.localStorage, nextPreference)
    setPreferenceState(nextPreference)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const systemThemeQuery = window.matchMedia(systemDarkQuery)
    const applyCurrentPreference = () => {
      setResolvedTheme(applyThemePreference(root, preference, systemThemeQuery.matches))
    }

    applyCurrentPreference()

    if (preference !== "system") {
      return undefined
    }

    systemThemeQuery.addEventListener("change", applyCurrentPreference)

    return () => {
      systemThemeQuery.removeEventListener("change", applyCurrentPreference)
    }
  }, [preference])

  return {
    preference,
    resolvedTheme,
    setPreference,
  }
}
