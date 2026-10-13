import { useTranslation } from "react-i18next"

import { PET_CATEGORY_IDS } from "../../constants/petCategories"
import { categoryToLabelKey } from "./myCategoryLabels"
import type { PetRegistrationFormState } from "./usePetRegistrationForm"

interface PetRegistrationFormProps {
  readonly form: PetRegistrationFormState
}

export function PetRegistrationForm({ form }: PetRegistrationFormProps) {
  const { t } = useTranslation()

  return (
    <form className="my-pet-form" onSubmit={(event) => void form.handleSubmit(event)}>
      <h2 className="my-section__title">{t(($) => $.my.petForm.heading)}</h2>
      <p className="my-pet-form__hint">{t(($) => $.local.limitation)}</p>
      <label className="my-pet-form__field">
        <span className="my-pet-form__label">{t(($) => $.my.petForm.name)}</span>
        <input
          className="my-pet-form__input"
          onChange={(event) => {
            form.handleNameChange(event.target.value)
          }}
          value={form.name}
        />
      </label>
      <label className="my-pet-form__field">
        <span className="my-pet-form__label">{t(($) => $.my.petForm.category)}</span>
        <select
          className="my-pet-form__input"
          onChange={(event) => {
            const category = PET_CATEGORY_IDS.find((candidate) => candidate === event.target.value)
            if (category !== undefined) {
              form.handleCategoryChange(category)
            }
          }}
          value={form.category}
        >
          {PET_CATEGORY_IDS.map((category) => (
            <option key={category} value={category}>
              {t(($) => $.home.categories[categoryToLabelKey(category)])}
            </option>
          ))}
        </select>
      </label>
      <label className="my-pet-form__field">
        <span className="my-pet-form__label">{t(($) => $.my.petForm.breed)}</span>
        <input
          className="my-pet-form__input"
          onChange={(event) => {
            form.handleBreedChange(event.target.value)
          }}
          value={form.breed}
        />
      </label>
      <label className="my-pet-form__field">
        <span className="my-pet-form__label">{t(($) => $.my.petForm.photo)}</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="my-pet-form__input"
          onChange={(event) => {
            void form.handlePhotoChange(event.target.files)
            event.target.value = ""
          }}
          type="file"
        />
      </label>
      {form.error === null ? null : (
        <p className="my-pet-form__message" role="alert">
          {form.error}
        </p>
      )}
      {form.status === "saved" ? (
        <p className="my-pet-form__message" role="status">
          {t(($) => $.my.petForm.saved)}
        </p>
      ) : null}
      <button className="my-pet-form__submit" disabled={form.isSubmitDisabled} type="submit">
        {form.status === "saving" ? t(($) => $.my.petForm.saving) : t(($) => $.my.petForm.submit)}
      </button>
    </form>
  )
}
