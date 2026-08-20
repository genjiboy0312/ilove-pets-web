import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ThemePreference } from "../theme/themePreference"
import { useThemePreference } from "../theme/useThemePreference"

const themeOptions = ["system", "light", "dark"] as const satisfies readonly ThemePreference[]

export function ThemePreferenceControls() {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemePreference()

  return (
    <div className="theme-control" role="group" aria-label={t(($) => $.theme.legend)}>
      {themeOptions.map((themeOption) => {
        const isSelected = preference === themeOption

        return (
          <button
            aria-pressed={isSelected}
            className="theme-control__button"
            key={themeOption}
            onClick={() => {
              setPreference(themeOption)
            }}
            type="button"
          >
            <span className="theme-control__label">{t(($) => $.theme.options[themeOption])}</span>
            <Check
              aria-hidden="true"
              className="theme-control__check"
              size={16}
              strokeWidth={2.5}
            />
          </button>
        )
      })}
    </div>
  )
}
