import { useEffect, useId, useState } from "react"
import type { SyntheticEvent } from "react"
import { useTranslation } from "react-i18next"

import type { IsoDateTimeString, PostId } from "../../types/domain"
import { getCurrentCommenter, getPostComments } from "./postCommentsData"
import type { PostCommentView } from "./postCommentsData"

function toIsoDateTimeString(date: Date): IsoDateTimeString {
  return date.toISOString() as IsoDateTimeString
}

interface CommentDialogProps {
  readonly postId: PostId
  readonly onClose: () => void
  readonly onCommentAdded: () => void
}

export function CommentDialog({ onClose, onCommentAdded, postId }: CommentDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const [draft, setDraft] = useState("")
  const [comments, setComments] = useState<readonly PostCommentView[]>(() =>
    getPostComments(postId),
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()

    if (content === "") {
      return
    }

    setComments((currentComments) => [
      ...currentComments,
      {
        commentId: `comment_local_${String(currentComments.length + 1)}`,
        authorName: getCurrentCommenter().name,
        authorAvatarUrl: getCurrentCommenter().avatarUrl,
        content,
        createdAt: toIsoDateTimeString(new Date()),
      },
    ])
    setDraft("")
    onCommentAdded()
  }

  return (
    <div className="comment-dialog__backdrop" onMouseDown={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="comment-dialog"
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
        role="dialog"
      >
        <header className="comment-dialog__header">
          <h2 className="comment-dialog__title" id={titleId}>
            {t(($) => $.home.comments.heading)}
          </h2>
          <button
            aria-label={t(($) => $.home.comments.close)}
            className="comment-dialog__close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </header>

        <div
          className="comment-dialog__list"
          role="list"
          aria-label={t(($) => $.home.comments.heading)}
        >
          {comments.length === 0 ? (
            <p className="comment-dialog__empty">{t(($) => $.home.comments.empty)}</p>
          ) : (
            comments.map((comment) => (
              <article className="comment-dialog__item" key={comment.commentId} role="listitem">
                <img
                  alt=""
                  className="comment-dialog__avatar"
                  height="32"
                  src={comment.authorAvatarUrl}
                  width="32"
                />
                <div className="comment-dialog__body">
                  <p className="comment-dialog__author">{comment.authorName}</p>
                  <p className="comment-dialog__content">{comment.content}</p>
                </div>
              </article>
            ))
          )}
        </div>

        <form className="comment-dialog__form" onSubmit={handleSubmit}>
          <label className="comment-dialog__input-label" htmlFor={`comment-input-${titleId}`}>
            <span className="comment-dialog__visually-hidden">
              {t(($) => $.home.comments.heading)}
            </span>
            <input
              className="comment-dialog__input"
              id={`comment-input-${titleId}`}
              onChange={(event) => {
                setDraft(event.target.value)
              }}
              placeholder={t(($) => $.home.comments.placeholder)}
              value={draft}
            />
          </label>
          <button className="comment-dialog__submit" disabled={draft.trim() === ""} type="submit">
            {t(($) => $.home.comments.submit)}
          </button>
        </form>
      </div>
    </div>
  )
}
