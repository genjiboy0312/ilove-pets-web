import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ThumbImage } from "../../components/ThumbImage"
import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategoryFilter } from "../../constants/petCategories"
import type { HttpsUrl, PostId } from "../../types/domain"
import { CategoryTabs } from "../home/CategoryTabs"
import { CommentDialog } from "../home/CommentDialog"
import { getExplorePets, getPopularPosts } from "./exploreData"
import type { ExplorePost } from "./exploreData"

const EXPLORE_PAGE_SIZE = 9

export function ExploreRoute() {
  const { t } = useTranslation()
  const [selectedFilter, setSelectedFilter] = useState<PetCategoryFilter>(PET_FILTER_ALL)
  const [pageCount, setPageCount] = useState(1)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [activePost, setActivePost] = useState<{
    readonly imageUrl: HttpsUrl
    readonly postId: PostId
  } | null>(null)
  const explorePets = getExplorePets(selectedFilter)
  const popularPosts = getPopularPosts()

  const gridItems = useMemo(() => {
    const items: Array<ExplorePost & { readonly itemKey: string }> = []

    for (let index = 0; index < pageCount * EXPLORE_PAGE_SIZE; index += 1) {
      const post = popularPosts[index % popularPosts.length]

      if (post === undefined) {
        break
      }

      items.push({ ...post, itemKey: `${post.postId}-${index}` })
    }

    return items
  }, [pageCount, popularPosts])

  useEffect(() => {
    const sentinel = sentinelRef.current

    if (sentinel === null || typeof IntersectionObserver === "undefined") {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPageCount((currentCount) => currentCount + 1)
      }
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section className="explore-screen" aria-labelledby="explore-route-title">
      <div className="explore-screen__heading-group">
        <p className="explore-screen__eyebrow">iLove Pets</p>
        <h1 className="explore-screen__title" id="explore-route-title">
          {t(($) => $.explore.heading)}
        </h1>
      </div>

      <form
        aria-label={t(($) => $.explore.searchLabel)}
        className="explore-search"
        onSubmit={(event) => {
          event.preventDefault()
        }}
        role="search"
      >
        <label className="explore-search__label" htmlFor="explore-search-input">
          {t(($) => $.explore.searchLabel)}
        </label>
        <div className="explore-search__row">
          <input
            className="explore-search__input"
            id="explore-search-input"
            placeholder={t(($) => $.explore.searchPlaceholder)}
            type="search"
          />
          <button className="explore-search__button" type="submit">
            {t(($) => $.explore.searchButton)}
          </button>
        </div>
      </form>

      <CategoryTabs
        ariaLabel={t(($) => $.explore.categoryLabel)}
        onSelectFilter={setSelectedFilter}
        selectedFilter={selectedFilter}
      />

      <section className="explore-section" aria-labelledby="explore-pets-title">
        <h2 className="explore-section__title" id="explore-pets-title">
          {t(($) => $.explore.popularPets)}
        </h2>
        {explorePets.length === 0 ? (
          <p className="explore-section__empty">{t(($) => $.explore.empty)}</p>
        ) : (
          <ul className="explore-pet-list">
            {explorePets.map((pet) => (
              <li className="explore-pet-card" key={pet.petId}>
                <ThumbImage
                  alt={pet.name}
                  className="explore-pet-card__avatar"
                  height={48}
                  src={pet.avatarUrl}
                  width={48}
                />
                <div className="explore-pet-card__identity">
                  <h3 className="explore-pet-card__name">{pet.name}</h3>
                  <p className="explore-pet-card__breed">{pet.breed}</p>
                  <p className="explore-pet-card__owner">@{pet.ownerUsername}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="explore-section" aria-labelledby="explore-posts-title">
        <h2 className="explore-section__title" id="explore-posts-title">
          {t(($) => $.explore.popularPosts)}
        </h2>
        <ul className="explore-grid">
          {gridItems.map((item) => (
            <li className="explore-grid__item" key={item.itemKey}>
              <button
                aria-label={item.petName}
                className="explore-grid__tile"
                onClick={() => {
                  setActivePost({ postId: item.postId, imageUrl: item.imageUrl })
                }}
                type="button"
              >
                <ThumbImage
                  alt={item.petName}
                  className="explore-grid__image"
                  src={item.imageUrl}
                />
              </button>
            </li>
          ))}
        </ul>
        <div aria-hidden="true" className="explore-grid__sentinel" ref={sentinelRef} />
      </section>

      {activePost === null ? null : (
        <CommentDialog
          onClose={() => {
            setActivePost(null)
          }}
          onCommentAdded={() => {}}
          postId={activePost.postId}
          postImageUrl={activePost.imageUrl}
        />
      )}
    </section>
  )
}
