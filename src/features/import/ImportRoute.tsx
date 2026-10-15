import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuth } from "../auth/AuthContext"
import { loadCloud, CloudError } from "../cloud/cloudApi"
import type { CloudPet } from "../cloud/cloudTypes"
import { prepareLocalBackup } from "../local/localContentBackup"
import type { PreparedBackup } from "../local/localContentBackup"
import { allImportReceipts, deviceImport, importItems, importOne } from "./importApi"
import type { ImportItem } from "./importApi"

export function ImportRoute() {
  const owner = useAuth().user?.id
  const { t } = useTranslation()
  return owner ? (
    <ImportSession key={owner} owner={owner} />
  ) : (
    <section className="cloud-screen">
      <h1>{t(($) => $.migration.title)}</h1>
      <Link to="/auth">{t(($) => $.social.signIn)}</Link>
    </section>
  )
}
function ImportSession({ owner }: { readonly owner: string }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ImportItem[]>([])
  const [pets, setPets] = useState<readonly CloudPet[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [ready, setReady] = useState(false)
  const alive = useRef(true)
  const stopped = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      stopped.current = true
    }
  }, [])
  const sources = [...new Set(items.map((i) => i.petSource))]
  const key = (item: ImportItem) => `${item.kind}:${item.source}`
  async function preview(source: () => Promise<PreparedBackup>) {
    setBusy(true)
    setError("")
    setConfirmed(false)
    setReady(false)
    setResults({})
    try {
      const [backup, cloud, receipts] = await Promise.all([
        source(),
        loadCloud(owner),
        allImportReceipts(owner),
      ])
      if (!alive.current) return
      const next = importItems(backup)
      const maps: Record<string, string> = {}
      for (const id of new Set(next.map((i) => i.petSource))) {
        const previous = receipts.find((r) => r.kind === "pet" && r.source_id === id)
        const previousRecord = receipts.find(
          (r) =>
            r.pet_id &&
            next.some((i) => i.petSource === id && i.kind === r.kind && i.source === r.source_id),
        )
        maps[id] =
          previous?.target_id ??
          previousRecord?.pet_id ??
          (backup.metadata.pets.some((p) => p.id === id) ? "new" : "")
      }
      setItems(next)
      setPets(cloud.pets)
      setMapping(maps)
      setReady(true)
    } catch {
      if (alive.current) setError(t(($) => $.migration.sourceError))
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  async function start() {
    setBusy(true)
    setError("")
    stopped.current = false
    const targets = { ...mapping }
    const requestedStop = () => stopped.current
    const check = () => {
      if (!alive.current) throw new Error("stopped")
    }
    try {
      for (const item of items) {
        check()
        if (requestedStop()) throw new Error("stopped")
        if (
          item.kind !== "pet" &&
          (!targets[item.petSource] || targets[item.petSource] === "new")
        ) {
          setResults((r) => ({ ...r, [key(item)]: t(($) => $.migration.petFailed) }))
          continue
        }
        try {
          const target = await importOne(
            owner,
            item,
            targets[item.petSource] === "new" ? null : (targets[item.petSource] ?? null),
            check,
          )
          if (item.kind === "pet") targets[item.petSource] = target
          if (alive.current) setResults((r) => ({ ...r, [key(item)]: t(($) => $.migration.done) }))
        } catch (e) {
          check()
          if (e instanceof CloudError && e.kind === "account") throw e
          if (item.kind === "pet") targets[item.petSource] = ""
          setResults((r) => ({
            ...r,
            [key(item)]:
              t(($) => $.migration.failed) +
              " " +
              (e instanceof CloudError ? t(($) => $.cloud.errors[e.kind]) : ""),
          }))
        }
      }
    } catch {
      if (alive.current) setError(t(($) => $.migration.stopped))
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  return (
    <section className="cloud-screen import-screen">
      <h1>{t(($) => $.migration.title)}</h1>
      <p>{t(($) => $.migration.notice)}</p>
      <Link to="/myaccount">{t(($) => $.cloud.back)}</Link>
      <div className="local-editor__actions">
        <button
          className="local-button"
          disabled={busy}
          onClick={() => {
            void preview(deviceImport)
          }}
        >
          {t(($) => $.migration.device)}
        </button>
        <label className="local-button">
          {t(($) => $.migration.backup)}
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = ""
              if (file) void preview(() => prepareLocalBackup(file))
            }}
          />
        </label>
      </div>
      {busy ? <p role="status">{t(($) => $.migration.busy)}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {ready ? (
        <>
          <p>
            {t(($) => $.migration.summary, {
              pets: items.filter((i) => i.kind === "pet").length,
              posts: items.filter((i) => i.kind === "post").length,
              growth: items.filter((i) => i.kind === "growth").length,
              photos: items.filter((i) => i.photo).length,
            })}
          </p>
          {items.length === 0 ? <p>{t(($) => $.migration.empty)}</p> : null}
          <fieldset disabled={busy}>
            <legend>{t(($) => $.migration.mapping)}</legend>
            {sources.map((id) => {
              const source = items.find((i) => i.kind === "pet" && i.source === id)
              return (
                <label key={id}>
                  {source?.label ?? id}
                  <select
                    value={mapping[id] ?? ""}
                    onChange={(e) => {
                      setMapping((m) => ({ ...m, [id]: e.target.value }))
                      setConfirmed(false)
                    }}
                  >
                    <option value="">{t(($) => $.migration.choose)}</option>
                    {source ? <option value="new">{t(($) => $.migration.newPet)}</option> : null}
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    {mapping[id] &&
                    mapping[id] !== "new" &&
                    !pets.some((p) => p.id === mapping[id]) ? (
                      <option value={mapping[id]}>{t(($) => $.migration.previous)}</option>
                    ) : null}
                  </select>
                </label>
              )
            })}
          </fieldset>
          <p>
            {t(($) => $.migration.mappingNotice)}{" "}
            <Link to="/cloud">{t(($) => $.profile.registerPet)}</Link>
          </p>
          <label>
            <input
              type="checkbox"
              disabled={busy}
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked)
              }}
            />
            {t(($) => $.migration.confirm)}
          </label>
          <button
            className="local-button"
            disabled={
              busy || !confirmed || items.length === 0 || sources.some((id) => !mapping[id])
            }
            onClick={() => {
              void start()
            }}
          >
            {t(($) => $.migration.start)}
          </button>
          {busy ? (
            <button
              className="local-button"
              onClick={() => {
                stopped.current = true
              }}
            >
              {t(($) => $.migration.stop)}
            </button>
          ) : null}
          <ol className="import-results">
            {items.map((item) => (
              <li key={key(item)}>
                <span>{item.label}</span>
                <strong role="status">{results[key(item)] ?? t(($) => $.migration.waiting)}</strong>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  )
}
