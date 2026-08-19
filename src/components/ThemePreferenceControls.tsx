import { useTranslation } from "react-i18next"

import type { ThemePreference } from "../theme/themePreference"
import { useThemePreference } from "../theme/useThemePreference"

const themeOptions = ["system", "light", "dark"] as const satisfies readonly ThemePreference[]

export function ThemePreferenceControls() {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemePreference()

  return (
    <div className="theme-control" role="group" aria-label={t(($) => $.theme.legend)}>
      {themeOptions.map((themeOption) => (
        <button
          aria-pressed={preference === themeOption}
          className="theme-control__button"
          key={themeOption}
          onClick={() => {
            setPreference(themeOption)
          }}
          type="button"
        >
          {t(($) => $.theme.options[themeOption])}
        </button>
      ))}
    </div>
  )
}
