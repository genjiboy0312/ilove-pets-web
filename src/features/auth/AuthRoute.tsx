import { useRef, useState } from "react"
import { PawPrint } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { submitEmailAuth, startGoogleSignIn } from "../../services/authActions"
import type { AuthMode } from "../../services/authActions"
import { useAuth } from "./AuthContext"

export function AuthRoute({ recovery = false }: { readonly recovery?: boolean }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const [mode, setMode] = useState<AuthMode>(recovery ? "password" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<
    "error" | "sent" | "saved" | "mismatch" | "signedIn" | "redirecting" | null
  >(null)
  const pending = useRef(false)
  async function run(
    operation: () => Promise<void>,
    outcome: "sent" | "saved" | "signedIn" | "redirecting",
  ) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setMessage(null)
    try {
      await operation()
      setPassword("")
      setConfirm("")
      setMessage(outcome)
      if (outcome === "saved") auth.clearRecovery()
    } catch {
      setMessage("error")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const available =
    auth.status === "ready" && (!recovery || (auth.user !== null && auth.recovering))
  return (
    <section className="auth-screen" aria-labelledby="auth-title">
      <div className="auth-brand" aria-hidden="true">
        <span>
          <PawPrint size={27} strokeWidth={1.7} />
        </span>
        <p>iLove Pets</p>
      </div>
      <h1 id="auth-title">{t(($) => $.auth.title)}</h1>
      <p>{t(($) => $.auth.localNotice)}</p>
      {auth.status === "unconfigured" ? <p role="status">{t(($) => $.auth.unconfigured)}</p> : null}
      {auth.status === "loading" ? <p role="status">{t(($) => $.auth.loading)}</p> : null}
      {auth.status === "error" ? <p role="alert">{t(($) => $.auth.error)}</p> : null}
      {recovery && !auth.recovering && message !== "saved" ? (
        <p>{t(($) => $.auth.recoveryRequired)}</p>
      ) : null}
      {!recovery ? (
        <div className="local-editor__actions">
          {(["login", "signup", "reset"] as const).map((value) => (
            <button
              className="local-button"
              key={value}
              type="button"
              disabled={busy}
              aria-pressed={mode === value}
              onClick={() => {
                setMode(value)
                setPassword("")
                setConfirm("")
                setMessage(null)
              }}
            >
              {t(($) => $.auth.modes[value])}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="local-editor"
        onSubmit={(event) => {
          event.preventDefault()
          if (!available || busy) return
          if ((mode === "signup" || mode === "password") && password !== confirm) {
            setMessage("mismatch")
            return
          }
          void run(
            () => submitEmailAuth(mode, email.trim(), password),
            mode === "reset" || mode === "signup"
              ? "sent"
              : mode === "password"
                ? "saved"
                : "signedIn",
          )
        }}
      >
        <fieldset className="local-editor__fields" disabled={!available || busy}>
          {mode === "password" ? null : (
            <label className="my-pet-form__field">
              <span>{t(($) => $.auth.email)}</span>
              <input
                className="my-pet-form__input"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                }}
              />
            </label>
          )}
          {mode === "reset" ? null : (
            <label className="my-pet-form__field">
              <span>{t(($) => $.auth.password)}</span>
              <input
                className="my-pet-form__input"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                }}
              />
            </label>
          )}
          {mode !== "signup" && mode !== "password" ? null : (
            <label className="my-pet-form__field">
              <span>{t(($) => $.auth.confirm)}</span>
              <input
                className="my-pet-form__input"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value)
                }}
              />
            </label>
          )}
          {mode === "signup" || mode === "password" ? <p>{t(($) => $.auth.passwordHint)}</p> : null}
          <button className="my-pet-form__submit" type="submit">
            {t(($) => $.auth.modes[mode])}
          </button>
        </fieldset>
      </form>
      {recovery ? null : (
        <button
          className="local-button"
          type="button"
          disabled={!available || busy}
          onClick={() => void run(startGoogleSignIn, "redirecting")}
        >
          {t(($) => $.auth.google)}
        </button>
      )}
      {message === null ? null : (
        <p role={message === "error" || message === "mismatch" ? "alert" : "status"}>
          {t(($) => $.auth[message])}
        </p>
      )}
      <Link className="local-button" to="/myaccount">
        {t(($) => $.auth.back)}
      </Link>
    </section>
  )
}
