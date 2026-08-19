import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { PET_FILTER_ALL } from "../../constants/petCategories"
import { i18n, initializeI18n } from "../../i18n/i18n"
import { getHomeFeedPosts } from "./homeFeedData"
import { HomeRoute } from "./HomeRoute"

describe("HomeRoute", () => {
  beforeEach(async () => {
    // Given: each HomeRoute test starts from Korean copy and clean language storage.
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("renders the Stage 5 Korean home feed by default", () => {
    // Given: the Stage 5 home route is opened with the default filter.
    const allPosts = getHomeFeedPosts(PET_FILTER_ALL)

    // When: the home route renders.
    render(<HomeRoute />)

    // Then: the page exposes the home heading, categories, full feed, and no Stage 4 status.
    expect(screen.getAllByRole("heading", { level: 1, name: "홈" })).toHaveLength(1)
    expect(screen.getByRole("region", { name: "반려동물 카테고리" })).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByText("프론트엔드 기반 준비 완료")).not.toBeInTheDocument()

    const feed = screen.getByRole("feed", { name: "반려동물 피드" })
    const articles = within(feed).getAllByRole("article")

    expect(articles).toHaveLength(allPosts.length)
    for (const post of allPosts) {
      expect(within(feed).getByText(post.petName)).toBeInTheDocument()
      expect(within(feed).getByText(post.content)).toBeInTheDocument()
    }
  })

  it("filters the home feed to only Bori when the DOG category is selected", () => {
    // Given: the Stage 5 home route is showing all posts.
    render(<HomeRoute />)

    // When: the user selects the dog category.
    fireEvent.click(screen.getByRole("button", { name: "강아지" }))

    // Then: only Bori's dog post remains in the feed.
    const feed = screen.getByRole("feed", { name: "반려동물 피드" })
    const articles = within(feed).getAllByRole("article")

    expect(articles).toHaveLength(1)
    expect(within(feed).getByText("Bori")).toBeInTheDocument()
    expect(within(feed).queryByText("Miso")).not.toBeInTheDocument()
    expect(within(feed).queryByText("Kiki")).not.toBeInTheDocument()
    expect(within(feed).queryByText("Tofu")).not.toBeInTheDocument()
  })

  it("shows the Korean empty state with no articles when the CAT category is selected", () => {
    // Given: the Stage 5 home route is showing all posts.
    render(<HomeRoute />)

    // When: the user selects the cat category.
    fireEvent.click(screen.getByRole("button", { name: "고양이" }))

    // Then: the feed communicates that the selected category has no posts.
    const feed = screen.getByRole("feed", { name: "반려동물 피드" })

    expect(within(feed).getByText("이 카테고리에는 아직 게시물이 없습니다.")).toBeInTheDocument()
    expect(within(feed).queryAllByRole("article")).toHaveLength(0)
    expect(within(feed).queryByText("Nori")).not.toBeInTheDocument()
  })
})
