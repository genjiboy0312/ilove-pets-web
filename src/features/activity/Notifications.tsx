import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "../auth/AuthContext"
import { cloudMutation } from "../cloud/cloudApi"
import { notificationPage, notificationsChanged } from "./notificationsApi"
import type { Notification } from "./notificationsApi"

export function Notifications({ onOpen = () => undefined }: { readonly onOpen?: () => void }) {
  const owner = useAuth().user?.id
  const { t } = useTranslation()
  return owner ? (
    <NotificationList key={owner} owner={owner} onOpen={onOpen} />
  ) : (
    <p>
      <Link to="/auth" onClick={onOpen}>
        {t(($) => $.social.signIn)}
      </Link>
    </p>
  )
}
function NotificationList({
  owner,
  onOpen,
}: {
  readonly owner: string
  readonly onOpen: () => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Notification[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  const [more, setMore] = useState(false)
  useEffect(() => {
    let alive = true
    void notificationPage(owner)
      .then((page) => {
        if (alive) {
          setRows(page)
          setMore(page.length === 30)
        }
      })
      .catch(() => {
        if (alive) setError(true)
      })
      .finally(() => {
        if (alive) setBusy(false)
      })
    return () => {
      alive = false
    }
  }, [owner])
  async function action(task: () => Promise<void>) {
    setBusy(true)
    setError(false)
    try {
      await task()
      notificationsChanged()
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  async function refresh() {
    const page = await notificationPage(owner)
    setRows(page)
    setMore(page.length === 30)
  }
  return (
    <div className="notification-panel">
      <div className="local-editor__actions">
        <button
          className="local-button"
          disabled={busy}
          onClick={() => {
            void action(refresh)
          }}
        >
          {t(($) => $.social.retry)}
        </button>
        <button
          className="local-button"
          disabled={busy || rows.every((r) => r.read)}
          onClick={() => {
            void action(async () => {
              await cloudMutation(owner, "read_all_notifications", {})
              await refresh()
            })
          }}
        >
          {t(($) => $.notifications.readAll)}
        </button>
      </div>
      {error ? <p role="alert">{t(($) => $.notifications.error)}</p> : null}
      {busy ? <p role="status">{t(($) => $.social.loading)}</p> : null}
      {rows.length === 0 && !error && !busy ? <p>{t(($) => $.notifications.empty)}</p> : null}
      <ul className="notification-list">
        {rows.map((row) => (
          <li key={row.id} className={row.read ? "" : "notification-unread"}>
            <p>{t(($) => $.notifications[row.kind], { actor: row.actor })}</p>
            <time dateTime={row.created}>
              {new Date(row.created).toLocaleString(i18n.language)}
            </time>
            <button
              className="local-button"
              disabled={busy}
              onClick={() => {
                void action(async () => {
                  // Revalidate before opening: a withdrawn/private target cannot be opened through stale UI.
                  await cloudMutation(owner, "read_notification", { p_id: row.id })
                  setRows((current) =>
                    current.map((r) => (r.id === row.id ? { ...r, read: true } : r)),
                  )
                  if (row.post) {
                    onOpen()
                    void navigate(`/posts/${encodeURIComponent(row.post)}`)
                  } else if (row.username) {
                    onOpen()
                    void navigate(`/users/${encodeURIComponent(row.username)}`)
                  }
                })
              }}
            >
              {t(
                row.post || row.username
                  ? ($) => $.notifications.open
                  : ($) => $.notifications.read,
              )}
            </button>
          </li>
        ))}
      </ul>
      {more ? (
        <button
          className="local-button"
          disabled={busy}
          onClick={() => {
            void action(async () => {
              const page = await notificationPage(owner, rows.at(-1))
              setRows((current) => [
                ...current,
                ...page.filter((r) => !current.some((old) => old.id === r.id)),
              ])
              setMore(page.length === 30)
            })
          }}
        >
          {t(($) => $.social.more)}
        </button>
      ) : null}
    </div>
  )
}
