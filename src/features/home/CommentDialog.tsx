import { useEffect, useId, useRef, useState } from "react"
import type { SyntheticEvent } from "react"
import { createPortal } from "react-dom"
import { useDialogFocus } from "../../components/useDialogFocus"
import { useTranslation } from "react-i18next"

import { addLocalComment } from "../local/localContentActions"
import { localContentChangedEvent } from "../local/localContentTypes"
import type { ImageSourceUrl, IsoDateTimeString, PostId } from "../../types/domain"
import { getCurrentCommenter, getPostComments } from "./postCommentsData"
import type { PostCommentView } from "./postCommentsData"

function toIsoDateTimeString(date: Date): IsoDateTimeString {
  return date.toISOString() as IsoDateTimeString
}

interface CommentDialogProps {
  readonly postId: PostId
  readonly postImageUrl: ImageSourceUrl
  readonly onClose: () => void
  readonly onCommentAdded: () => void
}

export function CommentDialog({
  onClose,
  onCommentAdded,
  postId,
  postImageUrl,
}: CommentDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useDialogFocus()
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const pending = useRef(false)
  const [draft, setDraft] = useState("")
  const [avatarLoadStates, setAvatarLoadStates] = useState<ReadonlySet<string>>(() => new Set())
  const [mediaLoadState, setMediaLoadState] = useState<"loaded" | "failed">("loaded")
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

  useEffect(() => {
    if (!postId.startsWith("post_local_")) return undefined
    const refresh = () => {
      try {
        setComments(getPostComments(postId))
      } catch {
        setSaveError(true)
      }
    }
    window.addEventListener(localContentChangedEvent, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(localContentChangedEvent, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [postId])

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()

    if (pending.current || content === "") {
      return
    }

    if (postId.startsWith("post_local_")) {
      pending.current = true
      setBusy(true)
      setSaveError(false)
      try {
        await addLocalComment(postId, content)
        setDraft("")
        onCommentAdded()
      } catch {
        setSaveError(true)
      } finally {
        pending.current = false
        setBusy(false)
      }
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

  return createPortal(
    <div className="comment-dialog__backdrop" onMouseDown={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="comment-dialog"
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
        ref={dialogRef}
        tabIndex={-1}
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

        <div className="comment-dialog__split">
          <div
            className="comment-dialog__media"
            data-image-state={mediaLoadState}
            data-testid="comment-dialog-media"
          >
            <img
              alt=""
              className="comment-dialog__media-image"
              decoding="async"
              onError={() => {
                setMediaLoadState("failed")
              }}
              src={postImageUrl}
            />
          </div>

          <div
            className="comment-dialog__list"
            role="list"
            aria-label={t(($) => $.home.comments.heading)}
          >
            {comments.length === 0 ? (
              <p className="comment-dialog__empty">{t(($) => $.home.comments.empty)}</p>
            ) : (
              comments.map((comment) => {
                const isAvatarFailed = avatarLoadStates.has(comment.commentId)

                return (
                  <article className="comment-dialog__item" key={comment.commentId} role="listitem">
                    <span
                      className="comment-dialog__avatar-frame"
                      data-image-state={isAvatarFailed ? "failed" : "loaded"}
                    >
                      <img
                        alt=""
                        className="comment-dialog__avatar"
                        height="32"
                        onError={() => {
                          setAvatarLoadStates((current) => new Set(current).add(comment.commentId))
                        }}
                        src={comment.authorAvatarUrl}
                        width="32"
                      />
                    </span>
                    <div className="comment-dialog__body">
                      <p className="comment-dialog__author">{comment.authorName}</p>
                      <p className="comment-dialog__content">{comment.content}</p>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>

        {saveError ? <p role="alert">{t(($) => $.manage.storageProblem)}</p> : null}
        <form className="comment-dialog__form" onSubmit={(event) => void handleSubmit(event)}>
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
          <button
            className="comment-dialog__submit"
            disabled={busy || draft.trim() === ""}
            type="submit"
          >
            {t(($) => $.home.comments.submit)}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
