import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"

import { ThemePreferenceControls } from "../../components/ThemePreferenceControls"
import { i18n } from "../../i18n/i18n"

const languageOptions = ["ko", "ja", "en"] as const

export function SettingsRoute() {
  const { t } = useTranslation()

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
        <div className="settings-card">
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
                  {t(($) => $.settings.languages[language])}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-notifications-title">
        <h2 className="settings-section__title" id="settings-notifications-title">
          {t(($) => $.settings.notifications)}
        </h2>
        <ul className="settings-list">
          <li className="settings-list__item">{t(($) => $.settings.likes)}</li>
          <li className="settings-list__item">{t(($) => $.settings.comments)}</li>
          <li className="settings-list__item">{t(($) => $.settings.follow)}</li>
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="settings-privacy-title">
        <h2 className="settings-section__title" id="settings-privacy-title">
          {t(($) => $.settings.privacy)}
        </h2>
        <ul className="settings-list">
          <li className="settings-list__item">{t(($) => $.settings.privacyPolicy)}</li>
        </ul>
      </section>

      <section className="settings-section" aria-labelledby="settings-service-title">
        <h2 className="settings-section__title" id="settings-service-title">
          {t(($) => $.settings.service)}
        </h2>
        <ul className="settings-list">
          <li className="settings-list__item">{t(($) => $.settings.terms)}</li>
          <li className="settings-list__item">{t(($) => $.settings.privacyPolicy)}</li>
          <li className="settings-list__item">{t(($) => $.settings.about)}</li>
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
    </section>
  )
}
