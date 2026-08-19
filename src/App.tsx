import { Navigate, Route, Routes } from "react-router"
import { useTranslation } from "react-i18next"

import { BottomNavigation } from "./components/BottomNavigation"
import { MobileAppShell } from "./components/MobileAppShell"
import type { ThemePreference } from "./theme/themePreference"
import { useThemePreference } from "./theme/useThemePreference"

const themeOptions = ["system", "light", "dark"] as const satisfies readonly ThemePreference[]

function ThemePreferenceControls() {
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

function HomeRoute() {
  const { t } = useTranslation()

  return (
    <section className="setup-status" role="status" aria-live="polite" aria-atomic="true">
      <p className="setup-status__label">{t(($) => $.setup.label)}</p>
      <h1 className="setup-status__title" id="app-title">
        {t(($) => $.app.title)}
      </h1>
      <p className="setup-status__body">
        {t(($) => $.setup.bodyLead)}{" "}
        <span className="setup-status__body-nowrap">{t(($) => $.setup.bodyNowrap)}</span>
      </p>
      <ul className="setup-status__list">
        <li>
          <span className="setup-status__item-label">
            {t(($) => $.setup.checklist.reactViteLabel)}
          </span>
          {t(($) => $.setup.checklist.reactViteText)}
        </li>
        <li>
          <span className="setup-status__item-label">{t(($) => $.setup.checklist.themeLabel)}</span>
          {t(($) => $.setup.checklist.themeText)}
        </li>
        <li>
          <span className="setup-status__item-label">{t(($) => $.setup.checklist.i18nLabel)}</span>
          {t(($) => $.setup.checklist.i18nText)}
        </li>
        <li>
          <span className="setup-status__item-label">
            {t(($) => $.setup.checklist.routingLabel)}
          </span>
          {t(($) => $.setup.checklist.routingText)}
        </li>
      </ul>
    </section>
  )
}

interface PlaceholderRouteProps {
  readonly routeKey: "explore" | "create" | "activity" | "my"
}

function PlaceholderRoute({ routeKey }: PlaceholderRouteProps) {
  const { t } = useTranslation()

  return (
    <section className="route-placeholder" aria-labelledby={`${routeKey}-route-title`}>
      <p className="route-placeholder__label">{t(($) => $.routes.placeholderLabel)}</p>
      <h1 className="route-placeholder__title" id={`${routeKey}-route-title`}>
        {t(($) => $.routes[routeKey].title)}
      </h1>
      <p className="route-placeholder__body">{t(($) => $.routes[routeKey].body)}</p>
    </section>
  )
}

export function App() {
  const { t } = useTranslation()

  return (
    <MobileAppShell
      bannerLabel={t(($) => $.shell.bannerLabel)}
      bottomNavigation={<BottomNavigation />}
      headerControls={<ThemePreferenceControls />}
      mainLabel={t(($) => $.shell.mainLabel)}
    >
      <Routes>
        <Route index element={<HomeRoute />} />
        <Route path="explore" element={<PlaceholderRoute routeKey="explore" />} />
        <Route path="create" element={<PlaceholderRoute routeKey="create" />} />
        <Route path="activity" element={<PlaceholderRoute routeKey="activity" />} />
        <Route path="my" element={<PlaceholderRoute routeKey="my" />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </MobileAppShell>
  )
}
