import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  getStoredNotificationPreferences,
  storeNotificationPreference,
} from "./notificationPreferences"
import type { NotificationPreferenceKey } from "./notificationPreferences"

const notificationOptions: readonly {
  readonly key: NotificationPreferenceKey
  readonly labelKey: "likes" | "comments" | "follow"
}[] = [
  { key: "likes", labelKey: "likes" },
  { key: "comments", labelKey: "comments" },
  { key: "follow", labelKey: "follow" },
]

export function NotificationPreferenceControls() {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState(() =>
    getStoredNotificationPreferences(window.localStorage),
  )

  function handleToggle(key: NotificationPreferenceKey) {
    setPreferences((current) => {
      const next = { ...current, [key]: !current[key] }

      storeNotificationPreference(window.localStorage, key, next[key])

      return next
    })
  }

  return (
    <ul className="settings-switch-list">
      {notificationOptions.map(({ key, labelKey }) => {
        const enabled = preferences[key]

        return (
          <li className="settings-switch-list__item" key={key}>
            <span className="settings-switch-list__label">{t(($) => $.settings[labelKey])}</span>
            <button
              aria-checked={enabled}
              aria-label={`${t(($) => $.settings[labelKey])} ${
                enabled ? t(($) => $.settings.switchOn) : t(($) => $.settings.switchOff)
              }`}
              className="settings-switch"
              onClick={() => {
                handleToggle(key)
              }}
              role="switch"
              type="button"
            >
              <span className="settings-switch__thumb" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
