import { useState } from "react"
import { useTranslation } from "react-i18next"

import { ThumbImage } from "../../components/ThumbImage"
import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategoryFilter } from "../../constants/petCategories"
import { CategoryTabs } from "../home/CategoryTabs"
import { getExplorePets, getPopularPosts } from "./exploreData"

export function ExploreRoute() {
  const { t } = useTranslation()
  const [selectedFilter, setSelectedFilter] = useState<PetCategoryFilter>(PET_FILTER_ALL)
  const explorePets = getExplorePets(selectedFilter)
  const popularPosts = getPopularPosts()

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

      <section className="explore-section" aria-labelledby="explore-posts-title">
        <h2 className="explore-section__title" id="explore-posts-title">
          {t(($) => $.explore.popularPosts)}
        </h2>
        <ul className="explore-post-list">
          {popularPosts.map((post) => (
            <li className="explore-post-card" key={post.postId}>
              <ThumbImage
                alt={post.petName}
                className="explore-post-card__image"
                src={post.imageUrl}
              />
              <div className="explore-post-card__identity">
                <p className="explore-post-card__pet-name">{post.petName}</p>
                <p className="explore-post-card__likes">
                  {t(($) => $.home.metrics.likeCount, { count: post.likeCount })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

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
    </section>
  )
}
