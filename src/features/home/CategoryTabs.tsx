import { Bird, Cat, Dog, LayoutGrid, Rabbit, Shapes, Turtle } from "lucide-react"
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
type CategoryLabelKey = keyof (typeof resources)["ko"]["translation"]["home"]["categories"]
const categoryLabelKeys = {
  ALL: "all",
  DOG: "dog",
  CAT: "cat",
  REPTILE: "reptile",
  BIRD: "bird",
  SMALL_ANIMAL: "smallAnimal",
  ETC: "etc",
} as const satisfies Record<PetCategoryFilter, CategoryLabelKey>
const categoryIcons = {
  ALL: LayoutGrid,
  DOG: Dog,
  CAT: Cat,
  REPTILE: Turtle,
  BIRD: Bird,
  SMALL_ANIMAL: Rabbit,
  ETC: Shapes,
}

export function CategoryTabs({ ariaLabel, selectedFilter, onSelectFilter }: CategoryTabsProps) {
  const { t } = useTranslation()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const updateEdges = useCallback(() => {
    const el = scrollerRef.current
    if (el)
      setEdges({
        left: el.scrollLeft > 1,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
  }, [])
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    updateEdges()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateEdges)
      return () => {
        window.removeEventListener("resize", updateEdges)
      }
    }
    const observer = new ResizeObserver(updateEdges)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    return () => {
      observer.disconnect()
    }
  }, [updateEdges])
  useEffect(() => {
    scrollerRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" })
    updateEdges()
  }, [selectedFilter, t, updateEdges])
  return (
    <section
      className="home-category-strip"
      aria-label={ariaLabel ?? t(($) => $.home.categoryLabel)}
    >
      <div
        className="home-category-strip__container"
        data-overflow-left={edges.left}
        data-overflow-right={edges.right}
      >
        <div
          className="home-category-strip__scroller"
          role="group"
          aria-label={t(($) => $.home.categoryLabel)}
          ref={scrollerRef}
          onScroll={updateEdges}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            )
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            if (index < 0) return
            event.preventDefault()
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : Math.max(
                      0,
                      Math.min(buttons.length - 1, index + (event.key === "ArrowRight" ? 1 : -1)),
                    )
            buttons[next]?.focus({ preventScroll: true })
            buttons[next]?.scrollIntoView({
              block: "nearest",
              inline: "nearest",
              behavior: "auto",
            })
          }}
        >
          {PET_FILTER_IDS.map((filterId) => {
            const selected = selectedFilter === filterId
            const Icon = categoryIcons[filterId]
            return (
              <button
                key={filterId}
                type="button"
                aria-pressed={selected}
                className={`home-category-strip__button${selected ? " home-category-strip__button--selected" : ""}`}
                onClick={() => {
                  onSelectFilter(filterId)
                }}
              >
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>{t(($) => $.home.categories[categoryLabelKeys[filterId]])}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
