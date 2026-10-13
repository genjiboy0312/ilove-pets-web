import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PET_CATEGORY_IDS } from "../../constants/petCategories"
import { updateLocalPet, deleteLocalPet } from "../local/localContentActions"
import type { LocalPet } from "../local/localContentTypes"
import { categoryToLabelKey } from "./myCategoryLabels"
import { MutationForm } from "./MutationForm"

interface LocalPetEditorProps {
  readonly pet: LocalPet
  readonly hasPosts: boolean
  readonly onDeleted: () => void
}

export function LocalPetEditor({ pet, hasPosts, onDeleted }: LocalPetEditorProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(pet.name)
  const [breed, setBreed] = useState(pet.breed)
  const [category, setCategory] = useState(pet.category)
  return (
    <section aria-label={t(($) => $.manage.editPet)}>
      <h3>{t(($) => $.manage.editPet)}</h3>
      <MutationForm
        onSave={() => updateLocalPet(pet.petId, { name, breed, category })}
        {...(hasPosts ? {} : { onDelete: () => deleteLocalPet(pet.petId) })}
        onDeleted={onDeleted}
      >
        <label className="my-pet-form__field">
          <span>{t(($) => $.my.petForm.name)}</span>
          <input
            required
            maxLength={80}
            className="my-pet-form__input"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
        </label>
        <label className="my-pet-form__field">
          <span>{t(($) => $.my.petForm.category)}</span>
          <select
            className="my-pet-form__input"
            value={category}
            onChange={(event) => {
              const next = PET_CATEGORY_IDS.find((id) => id === event.target.value)
              if (next !== undefined) setCategory(next)
            }}
          >
            {PET_CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {t(($) => $.home.categories[categoryToLabelKey(id)])}
              </option>
            ))}
          </select>
        </label>
        <label className="my-pet-form__field">
          <span>{t(($) => $.my.petForm.breed)}</span>
          <input
            required
            maxLength={120}
            className="my-pet-form__input"
            value={breed}
            onChange={(event) => {
              setBreed(event.target.value)
            }}
          />
        </label>
        {hasPosts ? <p>{t(($) => $.manage.linkedPet)}</p> : null}
      </MutationForm>
    </section>
  )
}
