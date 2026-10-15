import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { PET_CATEGORY_IDS } from "../../constants/petCategories"
import type { PetCategory } from "../../constants/petCategories"
import { localDate } from "../local/growthDates"
import { categoryToLabelKey } from "../my/myCategoryLabels"
import { cloudMutation, cleanupCloudMedia, uploadCloudImage } from "./cloudApi"
import type { CloudGrowth, CloudPet, CloudPost } from "./cloudTypes"

export type CloudRun = (action: () => Promise<void>) => Promise<boolean>
interface BaseProps {
  readonly owner: string
  readonly busy: boolean
  readonly run: CloudRun
  readonly close: () => void
}
export function CloudPetForm({
  owner,
  busy,
  run,
  close,
  pet,
}: { readonly pet?: CloudPet } & BaseProps) {
  const { t } = useTranslation()
  const id = useRef(pet?.id ?? crypto.randomUUID())
  const [name, setName] = useState(pet?.name ?? "")
  const [breed, setBreed] = useState(pet?.breed ?? "")
  const [category, setCategory] = useState<PetCategory>(pet?.category ?? "DOG")
  return (
    <form
      className="local-editor"
      onSubmit={(event) => {
        event.preventDefault()
        void run(() =>
          cloudMutation(owner, "save_pet", {
            p_id: id.current,
            p_name: name.trim(),
            p_breed: breed.trim(),
            p_category: category,
            p_expected_version: pet?.version ?? null,
          }),
        ).then((ok) => {
          if (ok) {
            if (pet) close()
            else {
              id.current = crypto.randomUUID()
              setName("")
              setBreed("")
            }
          }
        })
      }}
    >
      <fieldset className="local-editor__fields" disabled={busy}>
        <label>
          {t(($) => $.cloud.name)}
          <input
            className="my-pet-form__input"
            required
            maxLength={100}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </label>
        <label>
          {t(($) => $.cloud.category)}
          <select
            className="my-pet-form__input"
            value={category}
            onChange={(event) => {
              const value = PET_CATEGORY_IDS.find((item) => item === event.target.value)
              if (value) setCategory(value)
            }}
          >
            {PET_CATEGORY_IDS.map((value) => (
              <option key={value} value={value}>
                {t(($) => $.home.categories[categoryToLabelKey(value)])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(($) => $.cloud.breed)}
          <input
            className="my-pet-form__input"
            required
            maxLength={100}
            value={breed}
            onChange={(event) => {
              setBreed(event.target.value)
            }}
          />
        </label>
        <button className="local-button" type="submit">
          {t(($) => $.cloud.save)}
        </button>
        {pet ? (
          <button className="local-button" type="button" onClick={close}>
            {t(($) => $.cloud.cancel)}
          </button>
        ) : null}
      </fieldset>
    </form>
  )
}
export function CloudGrowthForm({
  owner,
  busy,
  run,
  close,
  pets,
  record,
}: { readonly pets: readonly CloudPet[]; readonly record?: CloudGrowth } & BaseProps) {
  const { t } = useTranslation()
  const id = useRef(record?.id ?? crypto.randomUUID())
  const [petId, setPetId] = useState(record?.petId ?? pets[0]?.id ?? "")
  const [date, setDate] = useState(record?.date ?? localDate())
  const [weight, setWeight] = useState(record?.weight?.toString() ?? "")
  const [note, setNote] = useState(record?.note ?? "")
  const selectedPet = record
    ? petId
    : pets.some((pet) => pet.id === petId)
      ? petId
      : (pets[0]?.id ?? "")
  return (
    <form
      className="local-editor"
      onSubmit={(event) => {
        event.preventDefault()
        if (!weight && !note.trim()) return
        void run(() =>
          cloudMutation(owner, "upsert_growth_record", {
            p_id: id.current,
            p_pet_id: selectedPet,
            p_record_date: date,
            p_weight_kg: weight ? Number(weight) : null,
            p_note: note.trim(),
            p_expected_version: record?.version ?? null,
          }),
        ).then((ok) => {
          if (ok) {
            if (record) close()
            else {
              id.current = crypto.randomUUID()
              setWeight("")
              setNote("")
            }
          }
        })
      }}
    >
      <fieldset className="local-editor__fields" disabled={busy || pets.length === 0}>
        <label>
          {t(($) => $.cloud.pet)}
          <select
            className="my-pet-form__input"
            value={selectedPet}
            disabled={record !== undefined}
            onChange={(event) => {
              setPetId(event.target.value)
            }}
            required
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t(($) => $.cloud.date)}
          <input
            className="my-pet-form__input"
            type="date"
            required
            max={localDate()}
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
            }}
          />
        </label>
        <label>
          {t(($) => $.cloud.weight)}
          <input
            className="my-pet-form__input"
            type="number"
            step="0.001"
            min="0.001"
            max="1000"
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value)
            }}
          />
        </label>
        <label>
          {t(($) => $.cloud.note)}
          <textarea
            className="my-pet-form__input"
            required={!weight}
            maxLength={500}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
            }}
          />
        </label>
        <button className="local-button" type="submit">
          {t(($) => $.cloud.save)}
        </button>
        {record ? (
          <button className="local-button" type="button" onClick={close}>
            {t(($) => $.cloud.cancel)}
          </button>
        ) : null}
      </fieldset>
    </form>
  )
}
export function CloudPostForm({
  owner,
  busy,
  run,
  close,
  pets,
  post,
}: { readonly pets: readonly CloudPet[]; readonly post?: CloudPost } & BaseProps) {
  const { t } = useTranslation()
  const id = useRef(post?.id ?? crypto.randomUUID())
  const asset = useRef(post?.assetId ?? null)
  const [petId, setPetId] = useState(post?.petId ?? pets[0]?.id ?? "")
  const [content, setContent] = useState(post?.content ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [fileVersion, setFileVersion] = useState(0)
  const selectedPet = post
    ? petId
    : pets.some((pet) => pet.id === petId)
      ? petId
      : (pets[0]?.id ?? "")
  return (
    <form
      className="local-editor"
      onSubmit={(event) => {
        event.preventDefault()
        void run(async () => {
          if (!asset.current) {
            if (!file) return
            asset.current = await uploadCloudImage(owner, file)
          }
          await cloudMutation(owner, "save_private_post", {
            p_id: id.current,
            p_pet_id: selectedPet,
            p_asset_id: asset.current,
            p_content: content.trim(),
            p_expected_version: post?.version ?? null,
          })
        }).then((ok) => {
          if (ok) {
            if (post) close()
            else {
              id.current = crypto.randomUUID()
              asset.current = null
              setContent("")
              setFile(null)
              setFileVersion((value) => value + 1)
            }
          }
        })
      }}
    >
      <fieldset className="local-editor__fields" disabled={busy || pets.length === 0}>
        <label>
          {t(($) => $.cloud.pet)}
          <select
            className="my-pet-form__input"
            value={selectedPet}
            disabled={post !== undefined}
            required
            onChange={(event) => {
              setPetId(event.target.value)
            }}
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
        </label>
        {post ? null : (
          <label>
            {t(($) => $.cloud.photo)}
            <input
              key={fileVersion}
              className="my-pet-form__input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={asset.current === null}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
              }}
              disabled={asset.current !== null}
            />
          </label>
        )}
        {!post && asset.current !== null ? (
          <button
            className="local-button"
            type="button"
            onClick={() => {
              void run(async () => {
                const unusedId = asset.current
                if (!unusedId) return
                await cloudMutation(owner, "discard_media", { p_id: unusedId })
                try {
                  await cleanupCloudMedia(owner)
                } catch {
                  /* Retain the queue and quota for explicit cleanup retry. */
                }
                asset.current = null
                setFile(null)
                setFileVersion((value) => value + 1)
              })
            }}
          >
            {t(($) => $.cloud.discard)}
          </button>
        ) : null}
        <label>
          {t(($) => $.cloud.content)}
          <textarea
            className="my-pet-form__input"
            required
            maxLength={2000}
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
            }}
          />
        </label>
        <button className="local-button" type="submit">
          {t(($) => $.cloud.save)}
        </button>
        {post ? (
          <button className="local-button" type="button" onClick={close}>
            {t(($) => $.cloud.cancel)}
          </button>
        ) : null}
      </fieldset>
    </form>
  )
}
