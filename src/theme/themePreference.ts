export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export const themePreferenceStorageKey = "ilove-pets-web:theme-preference"

export function normalizeThemePreference(value: string | null): ThemePreference {
  switch (value) {
    case "dark":
      return "dark"
    case "light":
      return "light"
    case "system":
      return "system"
    default:
      return "system"
  }
}

export function getStoredThemePreference(storage: Storage): ThemePreference {
  return normalizeThemePreference(storage.getItem(themePreferenceStorageKey))
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  switch (preference) {
    case "dark":
      return "dark"
    case "light":
      return "light"
    case "system":
      return systemPrefersDark ? "dark" : "light"
    default: {
      const exhaustivePreference: never = preference

      return exhaustivePreference
    }
  }
}

export function applyThemePreference(
  root: HTMLElement,
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  const resolvedTheme = resolveThemePreference(preference, systemPrefersDark)

  root.dataset["theme"] = resolvedTheme
  root.style.colorScheme = resolvedTheme

  return resolvedTheme
}

export function storeThemePreference(storage: Storage, preference: ThemePreference): void {
  storage.setItem(themePreferenceStorageKey, preference)
}
