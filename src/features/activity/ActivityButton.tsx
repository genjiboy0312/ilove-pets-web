import { Heart } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ActivityList } from "./ActivityList"
import { SettingsSheet } from "../settings/SettingsSheet"

export function ActivityButton() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        aria-label={t(($) => $.activity.heading)}
        className="icon-button--glass activity-button"
        onClick={() => {
          setIsOpen(true)
        }}
        type="button"
      >
        <Heart aria-hidden="true" size={20} strokeWidth={2.1} />
      </button>

      {isOpen ? (
        <SettingsSheet onClose={closeSheet} title={t(($) => $.activity.heading)}>
          <ActivityList />
        </SettingsSheet>
      ) : null}
    </>
  )

  function closeSheet() {
    setIsOpen(false)
  }
}
