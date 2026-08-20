import { Heart, MessageCircle, Send } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import type { MouseEventHandler, ReactEventHandler } from "react"
import { useTranslation } from "react-i18next"

import type { HomeFeedPost } from "./homeFeedData"
import { CommentDialog } from "./CommentDialog"

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

export function PostCard({ post }: PostCardProps) {
  const { i18n, t } = useTranslation()
  const [avatarLoadState, setAvatarLoadState] = useState<"loaded" | "failed">("loaded")
  const [imageLoadState, setImageLoadState] = useState<"loaded" | "failed">("loaded")
  const [isLikedByMe, setIsLikedByMe] = useState(post.isLikedByMe)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false)
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

  const metrics = {
    likeCount: t(($) => $.home.metrics.likeCount, { count: likeCount }),
    commentCount: t(($) => $.home.metrics.commentCount, { count: commentCount }),
  } as const
  const handleAvatarError: ReactEventHandler<HTMLImageElement> = () => {
    setAvatarLoadState("failed")
  }
  const handleImageError: ReactEventHandler<HTMLImageElement> = () => {
    setImageLoadState("failed")
  }

  function handleLikeToggle() {
    setIsLikedByMe((isLiked) => {
      const nextIsLiked = !isLiked

      setLikeCount((currentCount) => currentCount + (nextIsLiked ? 1 : -1))

      return nextIsLiked
    })
  }

  async function handleShare() {
    const shareData = {
      title: post.petName,
      text: post.content,
      url: window.location.href,
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData)
      } catch {
        // The user dismissed the native share sheet.
      }

      return
    }

    try {
      await navigator.clipboard.writeText(shareData.url)
      setIsShareToastVisible(true)
      window.setTimeout(() => {
        setIsShareToastVisible(false)
      }, 2000)
    } catch {
      // Clipboard access is not available in this browser context.
    }
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
        void handleShare()
      },
    },
  ]

  return (
    <article className="post-card">
      <header className="post-card__header">
        <span className="post-card__avatar-frame" data-image-state={avatarLoadState}>
          <img
            alt={t(($) => $.home.alt.petAvatar, { petName: post.petName })}
            className="post-card__avatar"
            height="48"
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
          onError={handleImageError}
          src={post.imageUrl}
        />
      </div>

      <div className="post-card__body">
        <p className="post-card__content">{post.content}</p>
        <ul className="post-card__tags" aria-label="Post tags">
          {post.tags.map((tag) => (
            <li className="post-card__tag" key={tag}>
              #{tag}
            </li>
          ))}
        </ul>
      </div>

      <footer className="post-card__actions">
        {postActions.map(({ Icon, className, labelKey, metricKey, onActivate }) => {
          const isLike = labelKey === "like"
          const metricText = metricKey === undefined ? undefined : metrics[metricKey]

          return (
            <button
              aria-label={t(($) => $.home.actions[labelKey])}
              aria-pressed={isLike ? isLikedByMe : undefined}
              className={["post-card__action", className].filter(Boolean).join(" ")}
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
            setCommentCount((currentCount) => currentCount + 1)
          }}
          postId={post.postId}
        />
      ) : null}

      {isShareToastVisible ? (
        <p aria-live="polite" className="post-card__share-toast" role="status">
          {t(($) => $.home.share.copied)}
        </p>
      ) : null}
    </article>
  )
}
