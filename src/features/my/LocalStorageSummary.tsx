import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { getPhotoStats } from "../local/photoStore"
import type { LocalContentSnapshot } from "../local/localContentTypes"

export function LocalStorageSummary({ snapshot }: { readonly snapshot: LocalContentSnapshot }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState<{ count: number; bytes: number } | null>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (snapshot.status !== "ready" && snapshot.status !== "error") return undefined
    let active = true
    void getPhotoStats()
      .then((value) => {
        if (active) setStats(value)
      })
      .catch(() => {
        if (active) setStats(null)
      })
    if ("storage" in navigator && typeof navigator.storage.estimate === "function") {
      void navigator.storage
        .estimate()
        .then((value) => {
          if (active) setEstimate(value)
        })
        .catch(() => {
          if (active) setEstimate(null)
        })
    }
    return () => {
      active = false
    }
  }, [snapshot.content, snapshot.status, retry])
  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
  return (
    <section className="local-backup" aria-labelledby="storage-summary-title">
      <h2 id="storage-summary-title">{t(($) => $.storage.title)}</h2>
      {snapshot.status === "error" ? (
        <p>{t(($) => $.manage.storageProblem)}</p>
      ) : (
        <p>
          {t(($) => $.storage.summary, {
            pets: snapshot.content.pets.length,
            posts: snapshot.content.posts.length,
            records: snapshot.content.pets.reduce(
              (count, pet) => count + (pet.growth?.length ?? 0),
              0,
            ),
          })}
        </p>
      )}
      <p aria-live="polite">
        {stats === null
          ? t(($) => $.storage.unavailable)
          : t(($) => $.storage.photos, { count: stats.count, size: mb(stats.bytes) })}
      </p>
      {estimate?.usage === undefined || estimate.quota === undefined ? null : (
        <p>
          {t(($) => $.storage.estimate, { used: mb(estimate.usage), quota: mb(estimate.quota) })}
        </p>
      )}
      <p>{t(($) => $.storage.help)}</p>
      <button
        className="local-button"
        type="button"
        onClick={() => {
          setRetry((value) => value + 1)
        }}
      >
        {t(($) => $.storage.retry)}
      </button>
    </section>
  )
}
