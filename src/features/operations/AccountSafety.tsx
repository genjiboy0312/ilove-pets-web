import { downloadCloudRecords } from "./cloudExport"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "../auth/AuthContext"
import { SettingsSheet } from "../settings/SettingsSheet"
import {
  blockedUsers,
  operation,
  OperationError,
  requestAccountDeletion,
  safetyChanged,
} from "./operationsApi"
import type { BlockedUser } from "./operationsApi"
function AccountSafetySession({
  owner,
  accepted,
}: {
  readonly owner: string
  readonly accepted: () => void
}) {
  const { t } = useTranslation()
  const [users, setUsers] = useState<BlockedUser[]>([]),
    [error, setError] = useState<OperationError["kind"] | null>(null),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [confirm, setConfirm] = useState(false),
    [text, setText] = useState(""),
    [revision, setRevision] = useState(0),
    [more, setMore] = useState(false)
  const pending = useRef(false)
  useEffect(() => {
    let active = true
    void blockedUsers(owner)
      .then((data) => {
        if (active) {
          setUsers(data)
          setMore(data.length === 100)
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof OperationError ? e.kind : "request")
      })
    return () => {
      active = false
    }
  }, [owner, revision])
  async function remove(target: string) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      await operation(owner, "set_user_block", { p_target: target, p_block: false })
      safetyChanged()
      setRevision((v) => v + 1)
    } catch {
      setError("request")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <section className="settings-section account-safety" aria-labelledby="account-safety-title">
      <h2 id="account-safety-title">{t(($) => $.operations.title)}</h2>
      <details>
        <summary>{t(($) => $.operations.blocked)}</summary>
        {users.length === 0 ? (
          <p>{t(($) => $.operations.emptyBlocks)}</p>
        ) : (
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                <span>
                  {user.display_name} · @{user.username}
                </span>
                <button
                  className="local-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void remove(user.id)
                  }}
                >
                  {t(($) => $.operations.unblock)}
                </button>
              </li>
            ))}
          </ul>
        )}
        {more ? (
          <button
            className="local-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void blockedUsers(owner, users.at(-1)?.id ?? null)
                .then((data) => {
                  setUsers((previous) => [...previous, ...data])
                  setMore(data.length === 100)
                })
                .catch(() => {
                  setError("request")
                })
                .finally(() => {
                  setBusy(false)
                })
            }}
          >
            {t(($) => $.operations.more)}
          </button>
        ) : null}
      </details>
      <button
        className="local-button account-safety__delete"
        type="button"
        onClick={() => {
          setOpen(true)
          setError(null)
        }}
      >
        {t(($) => $.operations.delete)}
      </button>
      {error && !open ? (
        <p role="alert">{t(($) => $.operations[error === "request" ? "error" : error])}</p>
      ) : null}
      {open ? (
        <SettingsSheet
          title={t(($) => $.operations.delete)}
          onClose={() => {
            if (!busy) setOpen(false)
          }}
        >
          <p>{t(($) => $.operations.deleteNotice)}</p>
          <button
            className="local-button"
            type="button"
            disabled={busy}
            onClick={() => {
              if (pending.current) return
              pending.current = true
              setBusy(true)
              setError(null)
              void downloadCloudRecords(owner)
                .catch(() => {
                  setError("request")
                })
                .finally(() => {
                  pending.current = false
                  setBusy(false)
                })
            }}
          >
            {t(($) => $.operations.backup)}
          </button>
          <p>{t(($) => $.operations.backupScope)}</p>
          <form
            className="account-deletion-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!confirm || text !== "DELETE" || pending.current) return
              pending.current = true
              setBusy(true)
              setError(null)
              void requestAccountDeletion(owner)
                .then(accepted)
                .catch((e: unknown) => {
                  setError(e instanceof OperationError ? e.kind : "request")
                })
                .finally(() => {
                  pending.current = false
                  setBusy(false)
                })
            }}
          >
            <label>
              <input
                type="checkbox"
                checked={confirm}
                disabled={busy}
                onChange={(event) => {
                  setConfirm(event.target.checked)
                }}
              />
              {t(($) => $.operations.deleteConfirm)}
            </label>
            <label>
              {t(($) => $.operations.deleteInput)}
              <input
                value={text}
                disabled={busy}
                autoComplete="off"
                onChange={(event) => {
                  setText(event.target.value)
                }}
              />
            </label>
            {error ? (
              <p role="alert">{t(($) => $.operations[error === "request" ? "error" : error])}</p>
            ) : null}
            {error === "reauth" ? (
              <Link to="/auth">{t(($) => $.operations.signInAgain)}</Link>
            ) : null}
            <button
              className="local-button account-safety__delete"
              type="submit"
              disabled={busy || !confirm || text !== "DELETE"}
            >
              {t(busy ? ($) => $.operations.pending : ($) => $.operations.deleteSubmit)}
            </button>
          </form>
        </SettingsSheet>
      ) : null}
    </section>
  )
}
export function AccountSafety() {
  const auth = useAuth()
  const { t } = useTranslation()
  const [acceptedOwner, setAcceptedOwner] = useState<string | null>(null)
  if (acceptedOwner !== null && (auth.user === null || auth.user.id === acceptedOwner))
    return <p role="status">{t(($) => $.operations.deletionAccepted)}</p>
  return auth.user ? (
    <AccountSafetySession
      key={auth.user.id}
      owner={auth.user.id}
      accepted={() => {
        setAcceptedOwner(auth.user?.id ?? null)
      }}
    />
  ) : null
}
