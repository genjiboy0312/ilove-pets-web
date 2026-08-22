import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { getCommunityPosts } from "./communityData"
import { CommunityRoute } from "./CommunityRoute"

describe("communityData", () => {
  it("keeps post ids unique and categories valid", () => {
    const posts = getCommunityPosts()
    const ids = posts.map((post) => post.postId)

    expect(new Set(ids).size).toBe(ids.length)
    expect(posts.every((post) => ["free", "info", "adopt"].includes(post.category))).toBe(true)
  })

  it("filters by category", () => {
    const adoptPosts = getCommunityPosts("adopt")

    expect(adoptPosts.every((post) => post.category === "adopt")).toBe(true)
    expect(adoptPosts.length).toBeGreaterThan(0)
  })
})

describe("CommunityRoute", () => {
  beforeEach(async () => {
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("names the route with a level-one Korean heading", () => {
    render(
      <MemoryRouter>
        <CommunityRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "커뮤니티" })).toBeInTheDocument()
  })

  it("lists community posts and filters by category chips", () => {
    render(
      <MemoryRouter>
        <CommunityRoute />
      </MemoryRouter>,
    )

    const list = screen.getByRole("list", { name: "커뮤니티 게시물" })
    expect(within(list).getAllByRole("listitem")).toHaveLength(getCommunityPosts().length)

    // When: the adoption category chip is selected.
    fireEvent.click(screen.getByRole("button", { name: "입양·임보" }))

    // Then: only adoption posts remain.
    const titles = within(list).getAllByRole("button").map((row) => row.textContent)

    expect(titles.length).toBe(2)
    expect(titles.join(" ")).toContain("임보")
  })

  it("opens the post detail sheet from a row", () => {
    render(
      <MemoryRouter>
        <CommunityRoute />
      </MemoryRouter>,
    )

    // When: the first community row is activated.
    const list = screen.getByRole("list", { name: "커뮤니티 게시물" })
    const firstRow = within(list).getAllByRole("button")[0]

    if (firstRow === undefined) {
      throw new Error("Expected at least one community row.")
    }

    fireEvent.click(firstRow)

    // Then: a detail dialog opens with the body and closes via 닫기.
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
