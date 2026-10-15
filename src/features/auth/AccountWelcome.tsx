import { useEffect, useRef, useState } from "react"
import { PawPrint, HardDrive } from "lucide-react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { startGoogleSignIn } from "../../services/authActions"
import { useAuth } from "./AuthContext"
import { metadataStorageKey, readMetadata } from "../local/localContentMetadata"
import { localContentChangedEvent } from "../local/localContentTypes"

function hasDeviceRecords() {
  try {
    const records = readMetadata()
    return records.pets.length > 0 || records.posts.length > 0
  } catch {
    return false
  }
}

export function AccountWelcome({ onUseDevice }: { readonly onUseDevice: () => void }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const [hasRecords, setHasRecords] = useState(hasDeviceRecords)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const refresh = () => {
      setHasRecords(hasDeviceRecords())
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === metadataStorageKey || event.key === null) refresh()
    }
    window.addEventListener(localContentChangedEvent, refresh)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(localContentChangedEvent, refresh)
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  async function signIn() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    try {
      await startGoogleSignIn()
    } catch {
      setFailed(true)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <section className="account-welcome" aria-labelledby="account-welcome-title">
        <span className="account-welcome__mark" aria-hidden="true">
          <PawPrint size={30} strokeWidth={1.6} />
        </span>
        <h2 id="account-welcome-title">{t(($) => $.accountUi.welcomeTitle)}</h2>
        <p>{t(($) => $.accountUi.welcomeDescription)}</p>
        <div className="account-welcome__actions">
          <button
            type="button"
            className="local-button account-welcome__google"
            disabled={busy || auth.status !== "ready"}
            onClick={() => {
              void signIn()
            }}
          >
            {t(($) => $.auth.google)}
          </button>
          <Link className="local-button" to="/auth">
            {t(($) => $.accountUi.emailSignIn)}
          </Link>
        </div>
        {auth.status === "unconfigured" ? (
          <p role="status">{t(($) => $.auth.unconfigured)}</p>
        ) : null}
        {failed || auth.status === "error" ? <p role="alert">{t(($) => $.auth.error)}</p> : null}
        {busy ? <p role="status">{t(($) => $.auth.loading)}</p> : null}
      </section>
      <div className="account-device-entry">
        <button type="button" onClick={onUseDevice}>
          <HardDrive size={16} aria-hidden="true" />
          {t(($) => $.accountUi.useDevice)}
        </button>
        <p>{t(($) => (hasRecords ? $.accountUi.devicePreserved : $.accountUi.deviceHint))}</p>
      </div>
    </>
  )
}
