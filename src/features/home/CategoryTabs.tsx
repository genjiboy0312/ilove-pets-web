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

  return (
    <section
      className="home-category-strip"
      aria-label={ariaLabel ?? t(($) => $.home.categoryLabel)}
    >
      <div className="home-category-strip__scroller">
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
    </section>
  )
}
