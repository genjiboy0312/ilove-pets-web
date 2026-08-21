import { act, fireEvent, render, screen, within } from "@testing-library/react"
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

  it("renders the explore feed as an image-only grid", () => {
    render(<ExploreRoute />)

    // When: the explore feed is discovered by its labelled region.
    const popularSection = screen.getByRole("region", { name: "인기 게시물" })

    // Then: the first page of square image tiles is rendered.
    expect(within(popularSection).getAllByRole("listitem")).toHaveLength(9)
    expect(within(popularSection).getAllByRole("img")).toHaveLength(9)
  })

  it("appends more tiles when the scroll sentinel becomes visible", () => {
    let sentinelCallback: IntersectionObserverCallback = () => {}

    class StubIntersectionObserver implements IntersectionObserver {
      readonly root: IntersectionObserver["root"] = null
      readonly rootMargin = ""
      readonly scrollMargin = ""
      readonly thresholds: ReadonlyArray<number> = []

      constructor(callback: IntersectionObserverCallback) {
        sentinelCallback = callback
      }

      disconnect(): void {}
      observe(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
      unobserve(): void {}
    }

    window.IntersectionObserver =
      StubIntersectionObserver as unknown as typeof IntersectionObserver

    render(<ExploreRoute />)
    const popularSection = screen.getByRole("region", { name: "인기 게시물" })
    expect(within(popularSection).getAllByRole("listitem")).toHaveLength(9)

    // When: the sentinel intersects the viewport.
    act(() => {
      sentinelCallback(
        [{ isIntersecting: true } as unknown as IntersectionObserverEntry],
        new StubIntersectionObserver(() => {}) as unknown as IntersectionObserver,
      )
    })

    // Then: another page of tiles is appended.
    expect(within(popularSection).getAllByRole("listitem")).toHaveLength(18)
  })

  it("opens the comment dialog from an explore tile", () => {
    render(<ExploreRoute />)

    // When: the user activates the first grid tile.
    const popularSection = screen.getByRole("region", { name: "인기 게시물" })
    const firstTile = within(popularSection).getAllByRole("button")[0]

    if (firstTile === undefined) {
      throw new Error("Expected at least one explore tile.")
    }

    fireEvent.click(firstTile)

    // Then: the comment dialog for that post opens.
    expect(screen.getByRole("dialog", { name: "댓글" })).toBeInTheDocument()

    // When: the dialog is closed.
    fireEvent.click(screen.getByRole("button", { name: "닫기" }))

    // Then: the dialog is removed again.
    expect(screen.queryByRole("dialog", { name: "댓글" })).not.toBeInTheDocument()
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
