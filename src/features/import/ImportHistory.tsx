import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { importHistory } from "./importApi"
import type { ImportReceipt } from "./importApi"
import { CloudImage } from "../cloud/CloudImage"

const text = (value: unknown) => (typeof value === "string" ? value : "")
const records = (value: unknown[]) =>
  value.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  )

export function ImportHistory({ owner }: { readonly owner: string }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<ImportReceipt[]>([])
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(false)
  useEffect(() => {
    let alive = true
    void importHistory(owner)
      .then((page) => {
        if (alive) {
          setRows(page)
          setMore(page.length === 100)
        }
      })
      .catch(() => {
        if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [owner])
  async function load(next: boolean) {
    setBusy(true)
    setError(false)
    try {
      const page = await importHistory(owner, next ? rows.at(-1)?.id : undefined)
      setRows((old) =>
        next ? [...old, ...page.filter((r) => !old.some((o) => o.id === r.id))] : page,
      )
      setMore(page.length === 100)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="account-records">
      <summary>{t(($) => $.migration.archive)}</summary>
      <p>{t(($) => $.migration.archiveNotice)}</p>
      <button
        className="local-button"
        disabled={busy}
        onClick={() => {
          void load(false)
        }}
      >
        {t(($) => $.social.retry)}
      </button>
      {error ? <p role="alert">{t(($) => $.notifications.error)}</p> : null}
      <ul className="cloud-list">
        {rows.map((row) => (
          <li key={row.id}>
            <p className="cloud-post__text">
              {text(row.payload["name"] ?? row.payload["content"] ?? row.payload["date"])}
            </p>
            {typeof row.payload["weightKg"] === "number" ? (
              <p>{row.payload["weightKg"]} kg</p>
            ) : null}
            {typeof row.payload["note"] === "string" ? (
              <p className="cloud-post__text">{row.payload["note"]}</p>
            ) : null}
            {typeof row.payload["createdAt"] === "string" ? (
              <time>{row.payload["createdAt"]}</time>
            ) : null}
            {row.kind === "pet" && row.asset_id ? (
              <CloudImage
                owner={owner}
                objectKey={`${owner}/${row.asset_id}/display.webp`}
                alt={text(row.payload["name"])}
              />
            ) : null}
            {Array.isArray(row.payload["tags"]) ? <p>{row.payload["tags"].join(" · ")}</p> : null}
            {Array.isArray(row.payload["comments"]) ? (
              <ul>
                {records(row.payload["comments"] as unknown[]).map((c, index) => (
                  <li key={index}>
                    <p className="cloud-post__text">{text(c["content"])}</p>
                    <time>{text(c["createdAt"])}</time>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {more ? (
        <button
          className="local-button"
          disabled={busy}
          onClick={() => {
            void load(true)
          }}
        >
          {t(($) => $.social.more)}
        </button>
      ) : null}
    </details>
  )
}
