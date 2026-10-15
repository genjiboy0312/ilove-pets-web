import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { signOut } from "../../services/authActions"
import { useAuth } from "./AuthContext"

export function AuthAccountCard() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  return (
    <section className="local-backup auth-account-card" aria-label={t(($) => $.auth.account)}>
      <h2>{t(($) => $.auth.account)}</h2>
      <p>{t(($) => $.auth.localNotice)}</p>
      {auth.user === null ? (
        <Link className="local-button" to="/auth">
          {t(($) => $.auth.title)}
        </Link>
      ) : (
        <>
          <p>{auth.user.email}</p>
          <Link className="local-button" to="/cloud">
            {t(($) => $.cloud.title)}
          </Link>
          <button
            className="local-button"
            type="button"
            disabled={busy}
            onClick={() => {
              if (pending.current) return
              pending.current = true
              setBusy(true)
              setFailed(false)
              void signOut()
                .catch(() => {
                  setFailed(true)
                })
                .finally(() => {
                  pending.current = false
                  setBusy(false)
                })
            }}
          >
            {t(($) => $.auth.signOut)}
          </button>
        </>
      )}
      {failed ? <p role="alert">{t(($) => $.auth.error)}</p> : null}
    </section>
  )
}
