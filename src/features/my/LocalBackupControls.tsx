import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  BackupError,
  exportLocalBackup,
  prepareLocalBackup,
  restoreLocalBackup,
} from "../local/localContentBackup"
import type { PreparedBackup } from "../local/localContentBackup"

export function LocalBackupControls() {
  const { t } = useTranslation()
  const [prepared, setPrepared] = useState<PreparedBackup | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<"export" | "restore" | null>(null)
  const pending = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  async function run(operation: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      await operation()
    } catch (failure) {
      setPrepared(null)
      const reason = failure instanceof BackupError ? failure.reason : "storage"
      setError(t(($) => $.backup.errors[reason]))
    } finally {
      pending.current = false
      setBusy(false)
      if (input.current !== null) input.current.value = ""
    }
  }

  async function download() {
    const blob = await exportLocalBackup()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ilove-pets-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
    setDone("export")
  }

  return (
    <section className="local-backup" aria-labelledby="local-backup-title">
      <h2 id="local-backup-title">{t(($) => $.backup.title)}</h2>
      <p>{t(($) => $.backup.notice)}</p>
      <fieldset className="local-editor__fields" disabled={busy} aria-busy={busy}>
        <button className="local-button" type="button" onClick={() => void run(download)}>
          {t(($) => $.backup.download)}
        </button>
        <label className="local-backup__file">
          <span>{t(($) => $.backup.select)}</span>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file === undefined) return
              setPrepared(null)
              void run(async () => {
                setPrepared(await prepareLocalBackup(file))
              })
            }}
          />
        </label>
        {prepared === null ? null : (
          <div className="local-confirm">
            <p role="status">
              {t(($) => $.backup.summary, {
                pets: prepared.metadata.pets.length,
                posts: prepared.metadata.posts.length,
                records: prepared.metadata.pets.reduce(
                  (count, pet) => count + (pet.growth?.length ?? 0),
                  0,
                ),
                photos: prepared.photos.size,
                size: (prepared.photoBytes / 1024 / 1024).toFixed(1),
              })}
            </p>
            <p>{t(($) => $.backup.replaceNotice)}</p>
            <button
              className="local-button"
              type="button"
              onClick={() =>
                void run(async () => {
                  await restoreLocalBackup(prepared)
                  setPrepared(null)
                  setDone("restore")
                })
              }
            >
              {t(($) => $.backup.confirm)}
            </button>
            <button
              className="local-button"
              type="button"
              onClick={() => {
                setPrepared(null)
              }}
            >
              {t(($) => $.manage.cancel)}
            </button>
          </div>
        )}
      </fieldset>
      {busy ? <p role="status">{t(($) => $.backup.busy)}</p> : null}
      {error === null ? null : <p role="alert">{error}</p>}
      {done === null ? null : (
        <p role="status">
          {t(done === "export" ? ($) => $.backup.downloaded : ($) => $.backup.restored)}
        </p>
      )}
    </section>
  )
}
