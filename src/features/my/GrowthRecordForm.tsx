import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  addGrowthRecord,
  deleteGrowthRecord,
  updateGrowthRecord,
} from "../local/localContentActions"
import { localDate, isGrowthInputValid } from "../local/growthDates"
import type { LocalPet } from "../local/localContentTypes"

export function GrowthRecordForm({ pet }: { readonly pet: LocalPet }) {
  const { t } = useTranslation()
  const [date, setDate] = useState(() => localDate())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [weight, setWeight] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<"saved" | "invalid" | "error" | null>(null)
  const pending = useRef(false)
  async function run(action: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setMessage("saved")
    } catch {
      setMessage("error")
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <section aria-label={t(($) => $.manage.growth)}>
      <h3>{t(($) => $.manage.growth)}</h3>
      <p>{t(($) => $.growthEdit.datePolicy)}</p>
      {editingId === null ? null : <p>{t(($) => $.growthEdit.editing)}</p>}
      <form
        className="local-editor"
        onSubmit={(event) => {
          event.preventDefault()
          const weightKg = weight.trim() === "" ? undefined : Number(weight)
          const input = { date, note, ...(weightKg === undefined ? {} : { weightKg }) }
          if (!isGrowthInputValid(input)) {
            setMessage("invalid")
            return
          }
          void run(async () => {
            if (editingId === null) await addGrowthRecord(pet.petId, input)
            else await updateGrowthRecord(pet.petId, editingId, input)
            setEditingId(null)
            setWeight("")
            setNote("")
          })
        }}
      >
        <fieldset className="local-editor__fields" disabled={busy}>
          <label className="my-pet-form__field">
            <span>{t(($) => $.manage.date)}</span>
            <input
              className="my-pet-form__input"
              required
              type="date"
              max={localDate()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
              }}
            />
          </label>
          <label className="my-pet-form__field">
            <span>{t(($) => $.manage.weight)}</span>
            <input
              className="my-pet-form__input"
              type="number"
              min="0.001"
              max="1000"
              step="0.001"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value)
              }}
            />
          </label>
          <label className="my-pet-form__field">
            <span>{t(($) => $.manage.note)}</span>
            <input
              className="my-pet-form__input"
              maxLength={500}
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
              }}
            />
          </label>
        </fieldset>
        <button className="my-pet-form__submit" type="submit" disabled={busy}>
          {t(editingId === null ? ($) => $.manage.addRecord : ($) => $.manage.save)}
        </button>
        {editingId === null ? null : (
          <button
            className="local-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setEditingId(null)
              setDate(localDate())
              setWeight("")
              setNote("")
              setMessage(null)
            }}
          >
            {t(($) => $.manage.cancel)}
          </button>
        )}
      </form>
      {message === null ? null : (
        <p role={message === "saved" ? "status" : "alert"}>
          {t(
            message === "saved"
              ? ($) => $.manage.saved
              : message === "invalid"
                ? ($) => $.manage.invalidRecord
                : ($) => $.manage.storageProblem,
          )}
        </p>
      )}
      <ul className="growth-records" aria-label={t(($) => $.manage.recordList)}>
        {(pet.growth ?? []).map((record) => (
          <li key={record.id}>
            <time dateTime={record.date}>{record.date}</time>{" "}
            <span>
              {record.weightKg === undefined ? "" : `${String(record.weightKg)} kg `}
              {record.note}
            </span>
            <button
              className="local-button"
              disabled={busy}
              type="button"
              aria-label={`${t(($) => $.growthEdit.edit)} ${record.date} ${record.note}`}
              onClick={() => {
                setEditingId(record.id)
                setDate(record.date)
                setWeight(record.weightKg === undefined ? "" : String(record.weightKg))
                setNote(record.note)
                setMessage(null)
              }}
            >
              {t(($) => $.growthEdit.edit)}
            </button>
            <button
              className="local-button"
              disabled={busy}
              type="button"
              aria-label={`${t(($) => $.manage.delete)} ${record.date} ${record.note}`}
              onClick={() =>
                void run(async () => {
                  await deleteGrowthRecord(pet.petId, record.id)
                  if (editingId === record.id) {
                    setEditingId(null)
                    setWeight("")
                    setNote("")
                  }
                })
              }
            >
              {t(($) => $.manage.delete)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
