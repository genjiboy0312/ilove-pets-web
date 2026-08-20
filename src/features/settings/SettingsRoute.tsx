import { ArrowLeft, Check } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import { ThemePreferenceControls } from "../../components/ThemePreferenceControls"
import { i18n } from "../../i18n/i18n"
import { NotificationPreferenceControls } from "./NotificationPreferenceControls"
import { SettingsSheet } from "./SettingsSheet"

const languageOptions = ["ko", "ja", "en"] as const

type InfoSheetKey = "terms" | "privacyPolicy" | "about"

export function SettingsRoute() {
  const { t } = useTranslation()
  const [openSheet, setOpenSheet] = useState<InfoSheetKey | null>(null)

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
        <Link className="settings-screen__back" to="/myaccount">
          <ArrowLeft
            aria-hidden="true"
            className="settings-screen__back-icon"
            size={18}
            strokeWidth={2.1}
          />
          <span className="settings-screen__back-label">{t(($) => $.settings.back)}</span>
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
        <div className="settings-control">
          <p className="settings-control__label">{t(($) => $.settings.theme)}</p>
          <ThemePreferenceControls />
        </div>
        <div className="settings-control">
          <p className="settings-control__label">{t(($) => $.settings.language)}</p>
          <div
            className="settings-language"
            role="group"
            aria-label={t(($) => $.settings.language)}
          >
            {languageOptions.map((language) => (
              <button
                aria-pressed={i18n.resolvedLanguage === language}
                className="settings-language__button"
                key={language}
                onClick={() => {
                  void i18n.changeLanguage(language)
                }}
                type="button"
              >
                <span className="settings-language__label">
                  {t(($) => $.settings.languages[language])}
                </span>
                <Check
                  aria-hidden="true"
                  className="settings-language__check"
                  size={16}
                  strokeWidth={2.5}
                />
              </button>
            ))}
          </div>
        </div>
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

      {openSheet === null ? null : (
        <SettingsSheet
          onClose={() => {
            setOpenSheet(null)
          }}
          title={infoSheetContent[openSheet].title}
        >
          <p className="settings-sheet__paragraph">{infoSheetContent[openSheet].body}</p>
        </SettingsSheet>
      )}
    </section>
  )
}
