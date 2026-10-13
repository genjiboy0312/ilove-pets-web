import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { resetLocalContent } from "../local/localContentActions"

export function LocalDataControls() {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle")
  const pending = useRef(false)
  async function reset() {
    if (pending.current) return
    pending.current = true
    setStatus("busy")
    try {
      await resetLocalContent()
      setStatus("done")
      setConfirming(false)
    } catch {
      setStatus("error")
    } finally {
      pending.current = false
    }
  }
  return (
    <section className="local-data-controls" aria-label={t(($) => $.manage.reset)}>
      <button
        className="local-button"
        type="button"
        onClick={() => {
          setConfirming(true)
        }}
      >
        {t(($) => $.manage.reset)}
      </button>
      {confirming ? (
        <div className="local-confirm">
          <p>{t(($) => $.manage.resetNotice)}</p>
          <button
            className="local-button"
            type="button"
            disabled={status === "busy"}
            onClick={() => void reset()}
          >
            {t(($) => $.manage.resetConfirm)}
          </button>
          <button
            className="local-button"
            type="button"
            disabled={status === "busy"}
            onClick={() => {
              setConfirming(false)
            }}
          >
            {t(($) => $.manage.cancel)}
          </button>
        </div>
      ) : null}
      {status === "done" ? <p role="status">{t(($) => $.manage.resetDone)}</p> : null}
      {status === "error" ? <p role="alert">{t(($) => $.manage.storageProblem)}</p> : null}
    </section>
  )
}
