import { describe, expect, it } from "vitest"

import { PET_CATEGORY_IDS, PET_FILTER_ALL, PET_FILTER_IDS } from "./petCategories"

describe("pet category constants", () => {
  it("preserves product category order without duplicates", () => {
    // Given: the product-defined pet category sequence.
    const expectedCategories = ["DOG", "CAT", "REPTILE", "BIRD", "SMALL_ANIMAL", "ETC"]

    // When: category IDs are read for domain fixtures and filters.
    const categoryIds = PET_CATEGORY_IDS

    // Then: the sequence and unique category set are stable.
    expect(categoryIds).toEqual(expectedCategories)
    expect(new Set(categoryIds).size).toBe(categoryIds.length)
  })

  it("prepends the all filter before category filters", () => {
    // Given: the all-filter sentinel and product category IDs.
    const expectedFilters = [PET_FILTER_ALL, ...PET_CATEGORY_IDS]

    // When: filter IDs are read for category filtering.
    const filterIds = PET_FILTER_IDS

    // Then: ALL appears once before the full category sequence.
    expect(filterIds).toEqual(expectedFilters)
    expect(new Set(filterIds).size).toBe(filterIds.length)
  })
})
