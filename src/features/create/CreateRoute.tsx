import { useTranslation } from "react-i18next"

import { getMyProfile } from "../my/myData"

export function CreateRoute() {
  const { t } = useTranslation()
  const profile = getMyProfile()

  return (
    <section className="create-screen" aria-labelledby="create-route-title">
      <div className="create-screen__heading-group">
        <p className="create-screen__eyebrow">iLove Pets</p>
        <h1 className="create-screen__title" id="create-route-title">
          {t(($) => $.create.heading)}
        </h1>
      </div>

      <form
        className="create-form"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="create-form__field">
          <span className="create-form__label">{t(($) => $.create.imageLabel)}</span>
          <button className="create-form__image-button" type="button">
            {t(($) => $.create.imageHint)}
          </button>
        </div>

        <div className="create-form__field">
          <label className="create-form__label" htmlFor="create-pet">
            {t(($) => $.create.petLabel)}
          </label>
          <select className="create-form__select" defaultValue="" id="create-pet">
            <option disabled value="">
              {t(($) => $.create.petPlaceholder)}
            </option>
            {profile.pets.map((pet) => (
              <option key={pet.petId} value={pet.petId}>
                {pet.name}
              </option>
            ))}
          </select>
        </div>

        <div className="create-form__field">
          <label className="create-form__label" htmlFor="create-content">
            {t(($) => $.create.contentLabel)}
          </label>
          <textarea
            className="create-form__textarea"
            id="create-content"
            placeholder={t(($) => $.create.contentPlaceholder)}
            rows={4}
          />
        </div>

        <div className="create-form__field">
          <label className="create-form__label" htmlFor="create-tags">
            {t(($) => $.create.tagLabel)}
          </label>
          <input
            className="create-form__input"
            id="create-tags"
            placeholder={t(($) => $.create.tagPlaceholder)}
            type="text"
          />
        </div>

        <p className="create-form__hint">{t(($) => $.create.hint)}</p>

        <button className="create-form__submit" type="submit">
          {t(($) => $.create.submit)}
        </button>
      </form>
    </section>
  )
}
