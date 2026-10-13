import { useState } from "react"
import { useTranslation } from "react-i18next"
import { updateLocalPost, deleteLocalPost } from "../local/localContentActions"
import { parseTags } from "../local/localContentParsing"
import type { LocalPost } from "../local/localContentTypes"
import { SettingsSheet } from "../settings/SettingsSheet"
import { MutationForm } from "./MutationForm"

export function LocalPostEditor({
  post,
  onClose,
}: {
  readonly post: LocalPost
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const [content, setContent] = useState(post.content)
  const [tags, setTags] = useState(post.tags.join(" "))
  return (
    <SettingsSheet title={t(($) => $.manage.editPost)} onClose={onClose}>
      <MutationForm
        onSave={() => updateLocalPost(post.postId, content, parseTags(tags))}
        onDelete={() => deleteLocalPost(post.postId)}
        onDeleted={onClose}
      >
        <label className="my-pet-form__field">
          <span>{t(($) => $.create.contentLabel)}</span>
          <textarea
            required
            maxLength={5000}
            className="my-pet-form__input"
            rows={4}
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
            }}
          />
        </label>
        <label className="my-pet-form__field">
          <span>{t(($) => $.create.tagLabel)}</span>
          <input
            className="my-pet-form__input"
            value={tags}
            onChange={(event) => {
              setTags(event.target.value)
            }}
          />
        </label>
      </MutationForm>
    </SettingsSheet>
  )
}
