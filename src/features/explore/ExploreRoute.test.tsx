import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { ExploreRoute } from "./ExploreRoute"

describe("ExploreRoute", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("names the route with a level-one Korean heading", () => {
    render(<ExploreRoute />)

    expect(screen.getByRole("heading", { level: 1, name: "탐색" })).toBeInTheDocument()
  })

  it("renders a search form with label and submit button", () => {
    render(<ExploreRoute />)

    const search = screen.getByRole("search")
    expect(search).toHaveAttribute("aria-label", "검색")
    expect(screen.getByRole("searchbox", { name: "검색" })).toHaveAttribute(
      "placeholder",
      "반려동물, 게시물, 태그 검색",
    )
    expect(within(search).getByRole("button", { name: "검색" })).toBeInTheDocument()
  })

  it("renders the category strip with the explore-specific label", () => {
    render(<ExploreRoute />)

    const categorySection = screen.getByRole("region", { name: "동물 카테고리" })
    const scroller = within(categorySection).getByRole("group")
    expect(within(scroller).getAllByRole("button")).toHaveLength(7)
  })

  it("lists popular posts with translated like metrics", () => {
    render(<ExploreRoute />)

    // When: the popular posts section is discovered by its labelled region.
    const popularSection = screen.getByRole("region", { name: "인기 게시물" })

    // Then: every popular post appears with a translated like metric.
    expect(within(popularSection).getAllByRole("listitem")).toHaveLength(4)
    expect(within(popularSection).getAllByText(/좋아요/)).toHaveLength(4)
  })

  it("filters popular pets by the selected category", () => {
    render(<ExploreRoute />)

    // Given: every pet category is selected by default.
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6)

    // When: the bird category is selected.
    fireEvent.click(screen.getByRole("button", { name: "조류" }))

    // Then: only the bird pet remains visible.
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1)
    expect(screen.getByRole("heading", { name: "Kiki" })).toBeInTheDocument()
  })
  it("filters popular pets to the reptile category", () => {
    render(<ExploreRoute />)

    // When: the reptile category is selected.
    fireEvent.click(screen.getByRole("button", { name: "파충류" }))

    // Then: only the reptile pet remains visible.
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1)
    expect(screen.getByRole("heading", { name: "Miso" })).toBeInTheDocument()
  })
})
