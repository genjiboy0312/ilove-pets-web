import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { PET_FILTER_IDS } from "../../constants/petCategories"
import type { PetCategoryFilter } from "../../constants/petCategories"
import type { resources } from "../../i18n/resources"

export interface CategoryTabsProps {
  readonly selectedFilter: PetCategoryFilter
  readonly onSelectFilter: (filter: PetCategoryFilter) => void
  readonly ariaLabel?: string
}

const categoryLabelKeys = {
  ALL: "all",
  DOG: "dog",
  CAT: "cat",
  REPTILE: "reptile",
  BIRD: "bird",
  SMALL_ANIMAL: "smallAnimal",
  ETC: "etc",
} as const satisfies Record<PetCategoryFilter, CategoryLabelKey>

type CategoryLabelKey = keyof (typeof resources)["ko"]["translation"]["home"]["categories"]

function getCategoryButtonClassName(isSelected: boolean): string {
  return isSelected
    ? "home-category-strip__button home-category-strip__button--selected"
    : "home-category-strip__button"
}

export function CategoryTabs({ ariaLabel, selectedFilter, onSelectFilter }: CategoryTabsProps) {
  const { t } = useTranslation()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current

    if (scroller === null) {
      return
    }

    setCanScrollLeft(scroller.scrollLeft > 0)
    setCanScrollRight(scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 1)
  }, [])

  const scrollByAmount = useCallback((direction: "left" | "right") => {
    const scroller = scrollerRef.current

    if (scroller === null) {
      return
    }

    const amount = Math.max(120, scroller.clientWidth * 0.6)

    scroller.scrollBy({ behavior: "smooth", left: direction === "left" ? -amount : amount })
  }, [])

  useEffect(() => {
    updateScrollState()
    window.addEventListener("resize", updateScrollState)

    return () => {
      window.removeEventListener("resize", updateScrollState)
    }
  }, [updateScrollState])

  return (
    <section
      className="home-category-strip"
      aria-label={ariaLabel ?? t(($) => $.home.categoryLabel)}
    >
      <div className="home-category-strip__container">
        <button
          aria-label={t(($) => $.home.categoryPrevious)}
          className="home-category-strip__arrow"
          disabled={!canScrollLeft}
          onClick={() => {
            scrollByAmount("left")
          }}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.1} />
        </button>
        <div
          aria-label={t(($) => $.home.categoryLabel)}
          className="home-category-strip__scroller"
          onScroll={updateScrollState}
          ref={scrollerRef}
          role="group"
        >
          {PET_FILTER_IDS.map((filterId) => {
            const isSelected = selectedFilter === filterId

            return (
              <button
                aria-pressed={isSelected}
                className={getCategoryButtonClassName(isSelected)}
                key={filterId}
                onClick={() => {
                  onSelectFilter(filterId)
                }}
                type="button"
              >
                {t(($) => $.home.categories[categoryLabelKeys[filterId]])}
              </button>
            )
          })}
        </div>
        <button
          aria-label={t(($) => $.home.categoryNext)}
          className="home-category-strip__arrow"
          disabled={!canScrollRight}
          onClick={() => {
            scrollByAmount("right")
          }}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={18} strokeWidth={2.1} />
        </button>
      </div>
    </section>
  )
}
