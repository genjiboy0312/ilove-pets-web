import { Heart } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Notifications } from "./Notifications"
import { NotificationBadge } from "./NotificationBadge"
import { useAuth } from "../auth/AuthContext"
import { SettingsSheet } from "../settings/SettingsSheet"

export function ActivityButton() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const owner = useAuth().user?.id

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
        {owner ? <NotificationBadge key={owner} owner={owner} /> : null}
      </button>

      {isOpen ? (
        <SettingsSheet onClose={closeSheet} title={t(($) => $.activity.heading)}>
          <Notifications onOpen={closeSheet} />
        </SettingsSheet>
      ) : null}
    </>
  )

  function closeSheet() {
    setIsOpen(false)
  }
}
