import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { operation, OperationError, safetyChanged } from "./operationsApi"
export function SafetyActions({
  owner,
  targetOwner,
  kind,
  target,
  changed,
  interact,
}: {
  readonly owner: string | null
  readonly targetOwner: string
  readonly kind: "profile" | "post" | "comment" | "story"
  readonly target: string
  readonly changed: () => void
  readonly interact?: () => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("spam"),
    [detail, setDetail] = useState(""),
    [busy, setBusy] = useState(false),
    [reported, setReported] = useState(false),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState<OperationError["kind"] | null>(null)
  const pending = useRef(false)
  if (!owner || owner === targetOwner) return null
  async function run(block: boolean) {
    if (pending.current || !owner) return
    pending.current = true
    setBusy(true)
    setError(null)
    try {
      if (block) {
        await operation(owner, "set_user_block", { p_target: targetOwner, p_block: true })
        safetyChanged()
        changed()
      } else {
        await operation(owner, "report_content", {
          p_kind: kind,
          p_target: target,
          p_reason: reason,
          p_detail: detail,
        })
        setReported(true)
      }
    } catch (e) {
      setError(e instanceof OperationError ? e.kind : "request")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <details
      className="safety-actions"
      onToggle={(event) => {
        if (event.currentTarget.open) interact?.()
      }}
    >
      <summary>{t(($) => $.operations.safety)}</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void run(false)
        }}
      >
        <label>
          {t(($) => $.operations.reason)}
          <select
            value={reason}
            disabled={busy || reported}
            onChange={(event) => {
              setReason(event.target.value)
            }}
          >
            {(["spam", "harassment", "privacy", "other"] as const).map((value) => (
              <option key={value} value={value}>
                {t(($) => $.operations[value])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(($) => $.operations.detail)}
          <textarea
            maxLength={500}
            disabled={busy || reported}
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value)
            }}
          />
        </label>
        <button className="local-button" type="submit" disabled={busy || reported}>
          {t(($) => $.operations.report)}
        </button>
        {reported ? <p role="status">{t(($) => $.operations.reported)}</p> : null}
      </form>
      {confirm ? (
        <div>
          <p>{t(($) => $.operations.blockNotice)}</p>
          <button
            className="local-button"
            type="button"
            disabled={busy}
            onClick={() => {
              void run(true)
            }}
          >
            {t(($) => $.operations.confirmBlock)}
          </button>
        </div>
      ) : (
        <button
          className="local-button"
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirm(true)
          }}
        >
          {t(($) => $.operations.block)}
        </button>
      )}
      {error ? (
        <p role="alert">{t(($) => $.operations[error === "request" ? "error" : error])}</p>
      ) : null}
    </details>
  )
}
