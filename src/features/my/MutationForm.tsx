import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { ReactNode, SyntheticEvent } from "react"

interface MutationFormProps {
  readonly onSave: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
  readonly onDelete?: () => Promise<void>
  readonly onDeleted?: () => void
  readonly children: ReactNode
}

export function MutationForm({ children, onSave, onDelete, onDeleted }: MutationFormProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<"saved" | "error" | null>(null)
  const pending = useRef(false)

  async function run(action: () => Promise<void>, deleting = false) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setMessage(null)
    try {
      await action()
      if (deleting) onDeleted?.()
      else setMessage("saved")
    } catch {
      setMessage("error")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <form
      className="local-editor"
      onSubmit={(event) => {
        event.preventDefault()
        void run(() => onSave(event))
      }}
    >
      <fieldset disabled={busy} className="local-editor__fields">
        {children}
      </fieldset>
      {message === null ? null : (
        <p role={message === "error" ? "alert" : "status"}>
          {t(message === "error" ? ($) => $.manage.storageProblem : ($) => $.manage.saved)}
        </p>
      )}
      <div className="local-editor__actions">
        <button className="my-pet-form__submit" disabled={busy} type="submit">
          {t(($) => $.manage.save)}
        </button>
        {onDelete === undefined ? null : (
          <button
            className="local-button"
            disabled={busy}
            type="button"
            onClick={() => {
              setConfirming(true)
            }}
          >
            {t(($) => $.manage.delete)}
          </button>
        )}
      </div>
      {confirming && onDelete !== undefined ? (
        <div className="local-confirm" role="group" aria-label={t(($) => $.manage.deleteNotice)}>
          <p>{t(($) => $.manage.deleteNotice)}</p>
          <button
            className="local-button"
            disabled={busy}
            type="button"
            onClick={() => void run(onDelete, true)}
          >
            {t(($) => $.manage.confirmDelete)}
          </button>
          <button
            className="local-button"
            disabled={busy}
            type="button"
            onClick={() => {
              setConfirming(false)
            }}
          >
            {t(($) => $.manage.cancel)}
          </button>
        </div>
      ) : null}
    </form>
  )
}
