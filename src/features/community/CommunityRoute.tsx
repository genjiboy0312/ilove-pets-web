import { ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ActivityButton } from "../activity/ActivityButton"
import { SettingsSheet } from "../settings/SettingsSheet"
import {
  getCommunityCategories,
  getCommunityPosts,
} from "./communityData"
import type { CommunityCategory } from "./communityData"
import { HospitalMap } from "./HospitalMap"

type CommunityView = "board" | "hospitalMap"

const categoryLabelKeys = {
  free: "categoryFree",
  info: "categoryInfo",
  adopt: "categoryAdopt",
} as const satisfies Record<CommunityCategory, "categoryFree" | "categoryInfo" | "categoryAdopt">

export function CommunityRoute() {
  const { t } = useTranslation()
  const [selectedView, setSelectedView] = useState<CommunityView>("board")
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory | "all">("all")
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const posts = useMemo(() => getCommunityPosts(selectedCategory), [selectedCategory])
  const activePost =
    activePostId === null
      ? undefined
      : getCommunityPosts().find((post) => post.postId === activePostId)

  function closeDetail() {
    setActivePostId(null)
  }

  return (
    <section className="community-screen" aria-labelledby="community-route-title">
      <header className="screen-header">
        <div className="community-screen__heading-group">
          <p className="community-screen__eyebrow">iLove Pets</p>
          <h1 className="community-screen__title" id="community-route-title">
            {t(($) => $.community.heading)}
          </h1>
        </div>
        <ActivityButton />
      </header>

      <div aria-label={t(($) => $.community.viewSwitcherLabel)} className="community-view-tabs" role="group">
        <button
          aria-pressed={selectedView === "board"}
          className="community-view-tabs__button"
          onClick={() => {
            setSelectedView("board")
          }}
          type="button"
        >
          {t(($) => $.community.boardTab)}
        </button>
        <button
          aria-pressed={selectedView === "hospitalMap"}
          className="community-view-tabs__button"
          onClick={() => {
            setSelectedView("hospitalMap")
          }}
          type="button"
        >
          {t(($) => $.community.hospitalMapTab)}
        </button>
      </div>

      {selectedView === "board" ? (
        <>
          <div aria-label={t(($) => $.community.filterLabel)} className="community-filter" role="group">
            <button
              aria-pressed={selectedCategory === "all"}
              className="community-filter__chip"
              onClick={() => {
                setSelectedCategory("all")
              }}
              type="button"
            >
              {t(($) => $.community.categoryAll)}
            </button>
            {getCommunityCategories().map((category) => (
              <button
                aria-pressed={selectedCategory === category}
                className="community-filter__chip"
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                }}
                type="button"
              >
                {t(($) => $.community[categoryLabelKeys[category]])}
              </button>
            ))}
          </div>

          {posts.length === 0 ? (
            <p className="community-screen__empty">{t(($) => $.community.empty)}</p>
          ) : (
            <ul className="community-list" aria-label={t(($) => $.community.listLabel)}>
              {posts.map((post) => (
                <li key={post.postId}>
                  <button
                    className="community-row"
                    onClick={() => {
                      setActivePostId(post.postId)
                    }}
                    type="button"
                  >
                    <span className="community-row__category">
                      {t(($) => $.community[categoryLabelKeys[post.category]])}
                    </span>
                    <span className="community-row__title">{post.title}</span>
                    <span className="community-row__meta">
                      @{post.authorName} ·{" "}
                      {t(($) => $.home.metrics.commentCount, { count: post.commentCount })}
                    </span>
                    <ChevronRight aria-hidden="true" size={16} strokeWidth={2.1} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <HospitalMap />
      )}

      {activePost === undefined ? null : (
        <SettingsSheet onClose={closeDetail} title={activePost.title}>
          <p className="community-detail__body">{activePost.body}</p>
          <p className="community-detail__meta">
            @{activePost.authorName} ·{" "}
            {t(($) => $.home.metrics.commentCount, { count: activePost.commentCount })}
          </p>
        </SettingsSheet>
      )}
    </section>
  )
}
