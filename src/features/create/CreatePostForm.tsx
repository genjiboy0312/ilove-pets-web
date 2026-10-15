import { ImagePlus, Sparkles } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import type { MyProfile } from "../my/myData"
import type { CreatePostFormState } from "./useCreatePostForm"

interface CreatePostFormProps {
  readonly form: CreatePostFormState
  readonly localErrorMessage: string | null
  readonly profile: MyProfile
}

export function CreatePostForm({ form, localErrorMessage, profile }: CreatePostFormProps) {
  const { t } = useTranslation()
  const photoInput = useRef<HTMLInputElement>(null)

  return (
    <form className="create-form" onSubmit={(event) => void form.handleSubmit(event)}>
      <p className="create-form__hint">
        <a href="/myaccount">{t(($) => $.my.petForm.heading)}</a>
      </p>
      <div className="create-form__field">
        <label className="create-form__label" htmlFor="create-photo">
          {t(($) => $.create.imageLabel)}
        </label>
        <button
          className="create-form__image-button"
          type="button"
          onClick={() => photoInput.current?.click()}
        >
          {form.previewUrl === null ? (
            <span className="create-form__image-placeholder">
              <ImagePlus aria-hidden="true" size={32} strokeWidth={1.5} />
              {t(($) => $.create.imageHint)}
            </span>
          ) : (
            <img alt="" className="create-form__preview" src={form.previewUrl} />
          )}
        </button>
        <input
          ref={photoInput}
          accept="image/jpeg,image/png,image/webp"
          className="create-form__file-input"
          id="create-photo"
          onChange={(event) => {
            void form.handlePhotoChange(event.target.files)
            event.target.value = ""
          }}
          type="file"
        />
      </div>

      <div className="create-form__field">
        <label className="create-form__label" htmlFor="create-pet">
          {t(($) => $.create.petLabel)}
        </label>
        <select
          className="create-form__select"
          id="create-pet"
          onChange={(event) => {
            form.handlePetChange(event.target.value)
          }}
          value={form.draft.petId}
        >
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
        <div className="create-form__label-row">
          <label className="create-form__label" htmlFor="create-content">
            {t(($) => $.create.contentLabel)}
          </label>
          <button
            className="create-form__ai-button"
            disabled={form.aiState === "loading"}
            onClick={form.handleAiSuggest}
            type="button"
          >
            <Sparkles aria-hidden="true" size={14} strokeWidth={2.1} />
            {form.aiState === "loading"
              ? t(($) => $.create.aiGenerating)
              : t(($) => $.create.aiButton)}
          </button>
        </div>
        <textarea
          className="create-form__textarea"
          id="create-content"
          onChange={(event) => {
            form.handleContentChange(event.target.value)
          }}
          placeholder={t(($) => $.create.contentPlaceholder)}
          rows={4}
          value={form.draft.content}
        />
        {form.aiState === "done" ? (
          <div
            className="create-form__suggestions"
            role="group"
            aria-label={t(($) => $.create.aiButton)}
          >
            {form.suggestions.map((suggestion) => (
              <button
                className="create-form__suggestion"
                key={suggestion}
                onClick={() => {
                  form.handleSuggestionPick(suggestion)
                }}
                type="button"
              >
                ✨ {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="create-form__field">
        <label className="create-form__label" htmlFor="create-tags">
          {t(($) => $.create.tagLabel)}
        </label>
        <input
          className="create-form__input"
          id="create-tags"
          onChange={(event) => {
            form.handleTagsChange(event.target.value)
          }}
          placeholder={t(($) => $.create.tagPlaceholder)}
          type="text"
          value={form.draft.tags}
        />
      </div>

      <p className="create-form__hint">{t(($) => $.create.hint)}</p>
      <p className="create-form__hint">{t(($) => $.local.draftPhoto)}</p>
      {form.publishError === null ? null : (
        <p className="create-form__message" role="alert">
          {form.publishError}
        </p>
      )}
      {form.publishState === "success" ? (
        <p className="create-form__message" role="status">
          {t(($) => $.create.publishSuccess)}
        </p>
      ) : null}
      {localErrorMessage === null ? null : (
        <p className="create-form__message" role="alert">
          {t(($) => $.manage.storageProblem)}
        </p>
      )}

      <button className="create-form__submit" disabled={form.isSubmitDisabled} type="submit">
        {form.publishState === "pending"
          ? t(($) => $.create.publishing)
          : t(($) => $.create.submit)}
      </button>
    </form>
  )
}
