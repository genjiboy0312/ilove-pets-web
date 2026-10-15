import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { notificationUnread } from "./notificationsApi"

export function NotificationBadge({ owner }: { readonly owner: string }) {
  const [count, setCount] = useState(0)
  const { t } = useTranslation()
  useEffect(() => {
    let alive = true
    let pending = false
    const refresh = () => {
      if (pending || document.visibilityState === "hidden") return
      pending = true
      void notificationUnread(owner)
        .then((n) => {
          if (alive) setCount(n)
        })
        .catch(() => undefined)
        .finally(() => {
          pending = false
        })
    }
    refresh()
    const timer = window.setInterval(refresh, 45000)
    window.addEventListener("focus", refresh)
    window.addEventListener("notifications-changed", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("notifications-changed", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [owner])
  return count > 0 ? (
    <span className="notification-badge" aria-label={t(($) => $.notifications.unread, { count })}>
      {count > 99 ? "99+" : count}
    </span>
  ) : null
}
