import { Heart, MessageCircle, Send } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { memo, useMemo, useRef, useState } from "react"
import type { MouseEventHandler, ReactEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { ContentOriginLabel } from "../../components/ContentOriginLabel"

import { setLocalPostLiked } from "../local/localContentActions"
import type { HomeFeedPost } from "./homeFeedData"
import { CommentDialog } from "./CommentDialog"
import { ShareSheet } from "./ShareSheet"

interface PostCardProps {
  readonly post: HomeFeedPost
}

interface PostAction {
  readonly Icon: LucideIcon
  readonly className?: string
  readonly labelKey: "like" | "comment" | "share"
  readonly metricKey?: "likeCount" | "commentCount"
  readonly onActivate?: MouseEventHandler<HTMLButtonElement>
}

export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  const { i18n, t } = useTranslation()
  const [avatarLoadState, setAvatarLoadState] = useState<"loaded" | "failed">("loaded")
  const [imageLoadState, setImageLoadState] = useState<"loaded" | "failed">("loaded")
  const [sessionLiked, setIsLikedByMe] = useState(post.isLikedByMe)
  const [sessionLikeCount, setLikeCount] = useState(post.likeCount)
  const [sessionCommentCount, setCommentCount] = useState(post.commentCount)
  const isLikedByMe = post.isLocalOnly ? post.isLikedByMe : sessionLiked
  const likeCount = post.isLocalOnly ? post.likeCount : sessionLikeCount
  const commentCount = post.isLocalOnly ? post.commentCount : sessionCommentCount
  const likePending = useRef(false)
  const [interactionError, setInteractionError] = useState(false)
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false)
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false)
  const [isShareToastVisible, setIsShareToastVisible] = useState(false)
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }),
    [i18n.language],
  )
  const postedTime = dateTimeFormatter.format(new Date(post.createdAt))

  const metrics = useMemo(
    () =>
      ({
        likeCount: t(($) => $.home.metrics.likeCount, { count: likeCount }),
        commentCount: t(($) => $.home.metrics.commentCount, { count: commentCount }),
      }) as const,
    [commentCount, likeCount, t],
  )
  const handleAvatarError: ReactEventHandler<HTMLImageElement> = () => {
    setAvatarLoadState("failed")
  }
  const handleImageError: ReactEventHandler<HTMLImageElement> = () => {
    setImageLoadState("failed")
  }

  function handleLikeToggle() {
    if (post.isLocalOnly) {
      if (likePending.current) return
      likePending.current = true
      setInteractionError(false)
      void setLocalPostLiked(post.postId, !post.isLikedByMe)
        .catch(() => {
          setInteractionError(true)
        })
        .finally(() => {
          likePending.current = false
        })
      return
    }
    setIsLikedByMe((isLiked) => {
      const nextIsLiked = !isLiked

      setLikeCount((currentCount) => currentCount + (nextIsLiked ? 1 : -1))

      return nextIsLiked
    })
  }

  const postActions: readonly PostAction[] = [
    {
      labelKey: "like",
      metricKey: "likeCount",
      className: "post-card__action--like",
      Icon: Heart,
      onActivate: handleLikeToggle,
    },
    {
      labelKey: "comment",
      metricKey: "commentCount",
      Icon: MessageCircle,
      onActivate: () => {
        setIsCommentDialogOpen(true)
      },
    },
    {
      labelKey: "share",
      Icon: Send,
      onActivate: () => {
        setIsShareSheetOpen(true)
      },
    },
  ]

  return (
    <article className="post-card" data-origin={post.isLocalOnly ? "local" : "demo"}>
      <header className="post-card__header">
        <span className="post-card__avatar-frame" data-image-state={avatarLoadState}>
          <img
            alt={t(($) => $.home.alt.petAvatar, { petName: post.petName })}
            className="post-card__avatar"
            decoding="async"
            height="48"
            loading="lazy"
            onError={handleAvatarError}
            src={post.petAvatarUrl}
            width="48"
          />
        </span>
        <div className="post-card__identity">
          <h2 className="post-card__pet-name">{post.petName}</h2>
          <p className="post-card__owner">@{post.ownerUsername}</p>
        </div>
        <time className="post-card__time" dateTime={post.createdAt}>
          {t(($) => $.home.time.postedAt, { time: postedTime })}
        </time>
      </header>

      <div className="post-card__image-frame" data-image-state={imageLoadState}>
        <img
          alt={t(($) => $.home.alt.postImage, { petName: post.petName })}
          className="post-card__image"
          decoding="async"
          loading="lazy"
          onError={handleImageError}
          src={post.imageUrl}
        />
      </div>

      <div className="post-card__body">
        <ContentOriginLabel local={post.isLocalOnly} />
        <p className="post-card__content">{post.content}</p>
        <ul className="post-card__tags" aria-label="Post tags">
          {post.tags.map((tag) => (
            <li className="post-card__tag" key={tag}>
              #{tag}
            </li>
          ))}
        </ul>
      </div>

      {interactionError ? <p role="alert">{t(($) => $.manage.storageProblem)}</p> : null}
      <footer className="post-card__actions">
        {postActions.map(({ Icon, className, labelKey, metricKey, onActivate }) => {
          const isLike = labelKey === "like"
          const metricText = metricKey === undefined ? undefined : metrics[metricKey]

          return (
            <button
              aria-label={t(($) => $.home.actions[labelKey])}
              aria-pressed={isLike ? isLikedByMe : undefined}
              className={["post-card__action", className].filter(Boolean).join(" ")}
              disabled={labelKey === "share" && post.isLocalOnly}
              key={labelKey}
              onClick={onActivate}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className="post-card__action-icon"
                fill={isLike && isLikedByMe ? "currentColor" : "none"}
                size={18}
                strokeWidth={2.1}
              />
              <span className="post-card__action-label">{t(($) => $.home.actions[labelKey])}</span>
              {metricText === undefined ? null : (
                <span className="post-card__metric">{metricText}</span>
              )}
              {labelKey === "share" && post.isLocalOnly ? (
                <span className="post-card__metric">{t(($) => $.home.share.localOnly)}</span>
              ) : null}
            </button>
          )
        })}
      </footer>

      {isCommentDialogOpen ? (
        <CommentDialog
          onClose={() => {
            setIsCommentDialogOpen(false)
          }}
          onCommentAdded={() => {
            if (!post.isLocalOnly) setCommentCount((currentCount) => currentCount + 1)
          }}
          postId={post.postId}
          postImageUrl={post.imageUrl}
        />
      ) : null}

      {isShareSheetOpen && !post.isLocalOnly ? (
        <ShareSheet
          onClose={() => {
            setIsShareSheetOpen(false)
          }}
          onCopied={() => {
            setIsShareToastVisible(true)
            window.setTimeout(() => {
              setIsShareToastVisible(false)
            }, 2000)
          }}
        />
      ) : null}

      {isShareToastVisible ? (
        <p aria-live="polite" className="post-card__share-toast" role="status">
          {t(($) => $.home.share.copied)}
        </p>
      ) : null}
    </article>
  )
})
