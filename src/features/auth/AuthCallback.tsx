import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router"
import { completeAuthUrl } from "../../services/authActions"
import { AuthRoute } from "./AuthRoute"
import { useAuth } from "./AuthContext"

export function AuthCallback({ recovery = false }: { readonly recovery?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAuth()
  const original = useRef(new URL(window.location.href))
  const [status, setStatus] = useState<"waiting" | "done" | "error">("waiting")
  useEffect(() => {
    let active = true
    // Remove auth parameters immediately, even on a failed exchange.
    window.history.replaceState(null, "", window.location.pathname)
    void completeAuthUrl(original.current)
      .then((recovering) => {
        if (!active) return
        setStatus("done")
        if (!recovery)
          void navigate(recovering ? "/auth/reset-password" : "/myaccount", { replace: true })
      })
      .catch(() => {
        if (active) setStatus("error")
      })
    return () => {
      active = false
    }
  }, [navigate, recovery])
  if (recovery && (status === "done" || auth.recovering)) return <AuthRoute recovery />
  return (
    <section className="auth-screen">
      <h1>{t(($) => $.auth.title)}</h1>
      <p role={status === "error" ? "alert" : "status"}>
        {t(status === "error" ? ($) => $.auth.callbackError : ($) => $.auth.loading)}
      </p>
      <Link className="local-button" to="/auth">
        {t(($) => $.auth.modes.login)}
      </Link>
    </section>
  )
}
