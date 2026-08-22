import { ArrowLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import type { ThemePreference } from "../../theme/themePreference"
import { i18n } from "../../i18n/i18n"
import { useThemePreference } from "../../theme/useThemePreference"
import { NotificationPreferenceControls } from "./NotificationPreferenceControls"
import { SettingsSheet } from "./SettingsSheet"

const languageOptions = ["ko", "ja", "en"] as const

const themeOptions = ["system", "light", "dark"] as const satisfies readonly ThemePreference[]
type InfoSheetKey = "terms" | "privacyPolicy" | "about"

type SheetKey = InfoSheetKey | "theme" | "language"

export function SettingsRoute() {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemePreference()
  const [openSheet, setOpenSheet] = useState<SheetKey | null>(null)
  const currentLanguage =
    languageOptions.find((language) => language === i18n.resolvedLanguage) ?? "ko"

  function closeSheet() {
    setOpenSheet(null)
  }

  const infoSheetContent: Record<InfoSheetKey, { readonly title: string; readonly body: string }> =
    {
      terms: { title: t(($) => $.settings.terms), body: t(($) => $.settings.termsBody) },
      privacyPolicy: {
        title: t(($) => $.settings.privacyPolicy),
        body: t(($) => $.settings.privacyPolicyBody),
      },
      about: { title: t(($) => $.settings.about), body: t(($) => $.settings.aboutBody) },
    }

  return (
    <section className="settings-screen" aria-labelledby="settings-route-title">
      <header className="settings-screen__header">
        <Link
          aria-label={t(($) => $.settings.back)}
          className="settings-screen__back"
          to="/myaccount"
        >
          <ArrowLeft
            aria-hidden="true"
            className="settings-screen__back-icon"
            size={18}
            strokeWidth={2.1}
          />
        </Link>
        <h1 className="settings-screen__title" id="settings-route-title">
          {t(($) => $.settings.heading)}
        </h1>
      </header>

      <section className="settings-section" aria-labelledby="settings-account-title">
        <h2 className="settings-section__title" id="settings-account-title">
          {t(($) => $.settings.account)}
        </h2>
        <ul className="settings-list">
          <li className="settings-list__item">{t(($) => $.settings.accountProfile)}</li>
          <li className="settings-list__item">{t(($) => $.settings.accountPets)}</li>
          <li className="settings-list__item">{t(($) => $.settings.accountManagement)}</li>
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="settings-appearance-title">
        <h2 className="settings-section__title" id="settings-appearance-title">
          {t(($) => $.settings.appearance)}
        </h2>
        <ul className="settings-list settings-list--buttons">
          <li className="settings-list__item">
            <button
              className="settings-list__button settings-list__button--value"
              onClick={() => {
                setOpenSheet("theme")
              }}
              type="button"
            >
              <span className="settings-list__button-label">{t(($) => $.settings.theme)}</span>
              <span className="settings-list__value">{t(($) => $.theme.options[preference])}</span>
              <ChevronRight
                aria-hidden="true"
                className="settings-list__chevron"
                size={16}
                strokeWidth={2.1}
              />
            </button>
          </li>
          <li className="settings-list__item">
            <button
              className="settings-list__button settings-list__button--value"
              onClick={() => {
                setOpenSheet("language")
              }}
              type="button"
            >
              <span className="settings-list__button-label">{t(($) => $.settings.language)}</span>
              <span className="settings-list__value">
                {t(($) => $.settings.languages[currentLanguage])}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="settings-list__chevron"
                size={16}
                strokeWidth={2.1}
              />
            </button>
          </li>
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="settings-notifications-title">
        <h2 className="settings-section__title" id="settings-notifications-title">
          {t(($) => $.settings.notifications)}
        </h2>
        <NotificationPreferenceControls />
      </section>

      <section className="settings-section" aria-labelledby="settings-privacy-title">
        <h2 className="settings-section__title" id="settings-privacy-title">
          {t(($) => $.settings.privacy)}
        </h2>
        <ul className="settings-list settings-list--buttons">
          <li className="settings-list__item">
            <button
              className="settings-list__button"
              onClick={() => {
                setOpenSheet("privacyPolicy")
              }}
              type="button"
            >
              {t(($) => $.settings.privacyPolicy)}
            </button>
          </li>
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="settings-service-title">
        <h2 className="settings-section__title" id="settings-service-title">
          {t(($) => $.settings.service)}
        </h2>
        <ul className="settings-list settings-list--buttons">
          <li className="settings-list__item">
            <button
              className="settings-list__button"
              onClick={() => {
                setOpenSheet("terms")
              }}
              type="button"
            >
              {t(($) => $.settings.terms)}
            </button>
          </li>
          <li className="settings-list__item">
            <button
              className="settings-list__button"
              onClick={() => {
                setOpenSheet("privacyPolicy")
              }}
              type="button"
            >
              {t(($) => $.settings.privacyPolicy)}
            </button>
          </li>
          <li className="settings-list__item">
            <button
              className="settings-list__button"
              onClick={() => {
                setOpenSheet("about")
              }}
              type="button"
            >
              {t(($) => $.settings.about)}
            </button>
          </li>
        </ul>
      </section>

      <div className="settings-actions">
        <button className="settings-actions__button" type="button">
          {t(($) => $.settings.logout)}
        </button>
        <button className="settings-actions__button settings-actions__button--danger" type="button">
          {t(($) => $.settings.deleteAccount)}
        </button>
        <p className="settings-actions__hint">{t(($) => $.settings.uiOnly)}</p>
      </div>

      {openSheet === null ? null : openSheet === "theme" ? (
        <SettingsSheet onClose={closeSheet} title={t(($) => $.settings.theme)}>
          <div
            aria-label={t(($) => $.settings.theme)}
            className="settings-option-list"
            role="listbox"
          >
            {themeOptions.map((themeOption) => (
              <button
                aria-selected={preference === themeOption}
                className="settings-option"
                key={themeOption}
                onClick={() => {
                  setPreference(themeOption)
                  closeSheet()
                }}
                role="option"
                type="button"
              >
                {t(($) => $.theme.options[themeOption])}
              </button>
            ))}
          </div>
        </SettingsSheet>
      ) : openSheet === "language" ? (
        <SettingsSheet onClose={closeSheet} title={t(($) => $.settings.language)}>
          <div
            aria-label={t(($) => $.settings.language)}
            className="settings-option-list"
            role="listbox"
          >
            {languageOptions.map((language) => (
              <button
                aria-selected={i18n.resolvedLanguage === language}
                className="settings-option"
                key={language}
                onClick={() => {
                  void i18n.changeLanguage(language)
                  closeSheet()
                }}
                role="option"
                type="button"
              >
                {t(($) => $.settings.languages[language])}
              </button>
            ))}
          </div>
        </SettingsSheet>
      ) : (
        <SettingsSheet onClose={closeSheet} title={infoSheetContent[openSheet].title}>
          <p className="settings-sheet__paragraph">{infoSheetContent[openSheet].body}</p>
        </SettingsSheet>
      )}
    </section>
  )
}
