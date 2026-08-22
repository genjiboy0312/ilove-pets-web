import { Heart } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { getReels } from "./reelsData"

export function ReelsFeed() {
  const { t } = useTranslation()
  const reels = getReels()
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(() => new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (container === null || typeof IntersectionObserver === "undefined") {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target.querySelector("video")

          if (video === null) {
            continue
          }

          if (entry.isIntersecting) {
            void video.play().catch(() => {
              // Autoplay can be blocked by the browser; the poster stays visible.
            })
          } else {
            video.pause()
          }
        }
      },
      { root: container, threshold: 0.6 },
    )

    for (const item of container.querySelectorAll(".reels-feed__item")) {
      observer.observe(item)
    }

    return () => {
      observer.disconnect()
    }
  }, [reels])

  function toggleLike(reelId: string) {
    setLikedIds((current) => {
      const next = new Set(current)

      if (next.has(reelId)) {
        next.delete(reelId)
      } else {
        next.add(reelId)
      }

      return next
    })
  }

  return (
    <div aria-label={t(($) => $.explore.reelsLabel)} className="reels-feed" ref={containerRef}>
      {reels.map((reel) => {
        const isLiked = likedIds.has(reel.reelId)
        const likeCount = reel.likeCount + (isLiked ? 1 : 0)

        return (
          <section
            aria-label={`${reel.petName} ${reel.caption}`}
            className="reels-feed__item"
            key={reel.reelId}
          >
            <video
              className="reels-feed__video"
              loop
              muted
              playsInline
              preload="metadata"
              src={reel.videoUrl}
            />
            <div className="reels-feed__overlay">
              <p className="reels-feed__caption">
                <strong>@{reel.petName}</strong> {reel.caption}
              </p>
              <button
                aria-label={t(($) => $.home.actions.like)}
                aria-pressed={isLiked}
                className={[
                  "reels-feed__like",
                  isLiked ? "reels-feed__like--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  toggleLike(reel.reelId)
                }}
                type="button"
              >
                <Heart fill={isLiked ? "currentColor" : "none"} size={24} strokeWidth={2.1} />
                <span>{likeCount}</span>
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
