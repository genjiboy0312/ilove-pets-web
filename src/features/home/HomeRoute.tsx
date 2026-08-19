import { useState } from "react"
import { useTranslation } from "react-i18next"

import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategoryFilter } from "../../constants/petCategories"
import { CategoryTabs } from "./CategoryTabs"
import { getHomeFeedPosts } from "./homeFeedData"
import { PostCard } from "./PostCard"

export function HomeRoute() {
  const { t } = useTranslation()
  const [selectedFilter, setSelectedFilter] = useState<PetCategoryFilter>(PET_FILTER_ALL)
  const posts = getHomeFeedPosts(selectedFilter)

  return (
    <section className="home-screen" aria-labelledby="home-route-title">
      <div className="home-screen__heading-group">
        <p className="home-screen__eyebrow">iLove Pets</p>
        <h1 className="home-screen__title" id="home-route-title">
          {t(($) => $.home.heading)}
        </h1>
      </div>

      <CategoryTabs selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />

      <div className="home-feed" role="feed" aria-label={t(($) => $.home.feedLabel)}>
        {posts.length === 0 ? (
          <p className="home-feed__empty">{t(($) => $.home.empty)}</p>
        ) : (
          posts.map((post) => <PostCard key={post.postId} post={post} />)
        )}
      </div>
    </section>
  )
}
