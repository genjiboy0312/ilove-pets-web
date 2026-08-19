import { Heart, MessageCircle, Send } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import type { ReactEventHandler } from "react"
import { useTranslation } from "react-i18next"

import type { HomeFeedPost } from "./homeFeedData"

interface PostCardProps {
  readonly post: HomeFeedPost
}

interface PostAction {
  readonly Icon: LucideIcon
  readonly className?: string
  readonly metricKey?: "likeCount" | "commentCount"
  readonly labelKey: "like" | "comment" | "share"
}

const postActions: readonly PostAction[] = [
  { labelKey: "like", metricKey: "likeCount", Icon: Heart, className: "post-card__action--like" },
  { labelKey: "comment", metricKey: "commentCount", Icon: MessageCircle },
  { labelKey: "share", Icon: Send },
]

export function PostCard({ post }: PostCardProps) {
  const { i18n, t } = useTranslation()
  const [avatarLoadState, setAvatarLoadState] = useState<"loaded" | "failed">("loaded")
  const [imageLoadState, setImageLoadState] = useState<"loaded" | "failed">("loaded")
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
    likeCount: t(($) => $.home.metrics.likeCount, { count: post.likeCount }),
    commentCount: t(($) => $.home.metrics.commentCount, { count: post.commentCount }),
  } as const
  const handleAvatarError: ReactEventHandler<HTMLImageElement> = () => {
    setAvatarLoadState("failed")
  }
  const handleImageError: ReactEventHandler<HTMLImageElement> = () => {
    setImageLoadState("failed")
  }

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
        {postActions.map(({ Icon, className, labelKey, metricKey }) => {
          const metricText = metricKey === undefined ? undefined : metrics[metricKey]

          return (
            <button
              className={["post-card__action", className].filter(Boolean).join(" ")}
              key={labelKey}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className="post-card__action-icon"
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
    </article>
  )
}
