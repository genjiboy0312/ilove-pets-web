import { useTranslation } from "react-i18next"

import { useLocalContent } from "../local/useLocalContent"
import { getMyProfile } from "../my/myData"
import { CreatePostForm } from "./CreatePostForm"
import { useCreatePostForm } from "./useCreatePostForm"

export function CreateRoute() {
  const { t } = useTranslation()
  const localContent = useLocalContent()
  const profile = getMyProfile(localContent.content)
  const form = useCreatePostForm(t, profile)

  return (
    <section className="create-screen" aria-labelledby="create-route-title">
      <div className="create-screen__heading-group">
        <p className="create-screen__eyebrow">iLove Pets</p>
        <h1 className="create-screen__title" id="create-route-title">
          {t(($) => $.create.heading)}
        </h1>
      </div>
      {localContent.status === "ready" && localContent.content.pets.length === 0 ? (
        <div className="create-form__hint">
          <p>{t(($) => $.storage.startHint)}</p>
          <a className="local-button" href="/myaccount#pet-registration">
            {t(($) => $.storage.start)}
          </a>
        </div>
      ) : null}
      <CreatePostForm form={form} localErrorMessage={localContent.errorMessage} profile={profile} />
    </section>
  )
}
