import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { MyRoute } from "./MyRoute"

describe("MyRoute", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("names the route with a level-one Korean heading", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "내 계정" })).toBeInTheDocument()
  })

  it("links to the settings route from the header", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    const settingsLink = screen.getByRole("link", { name: "설정" })
    expect(settingsLink).toHaveAttribute("href", "/settings")
  })

  it("renders the current user's profile identity", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: "Mira Han" })).toBeInTheDocument()
    expect(screen.getByText("@mira")).toBeInTheDocument()
    expect(screen.getByText("Weekend foster and reptile keeper.")).toBeInTheDocument()
  })

  it("renders the post, follower, and following statistics", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    expect(screen.getByText("게시물 2개")).toBeInTheDocument()
    expect(screen.getByText("팔로워 128명")).toBeInTheDocument()
    expect(screen.getByText("팔로잉 46명")).toBeInTheDocument()
  })

  it("lists the registered pets with translated section heading", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: "등록 펫" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Bori" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Miso" })).toBeInTheDocument()
  })

  it("renders the post grid with one tile per my post", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    // When: the post grid section is discovered by its labelled region.
    const grid = screen.getByRole("region", { name: "내 게시물" })

    // Then: one list item exists per my post.
    expect(within(grid).getAllByRole("listitem")).toHaveLength(2)
  })

  it("collapses and expands the pets and posts sections", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    const petsToggle = screen.getByRole("button", { name: "등록 펫" })
    const postsToggle = screen.getByRole("button", { name: "내 게시물" })

    expect(petsToggle).toHaveAttribute("aria-expanded", "true")
    expect(postsToggle).toHaveAttribute("aria-expanded", "true")

    // When: both sections are collapsed.
    fireEvent.click(petsToggle)
    fireEvent.click(postsToggle)

    // Then: their content is hidden.
    expect(screen.queryByRole("heading", { level: 3, name: "Bori" })).not.toBeInTheDocument()
    const grid = screen.getByRole("region", { name: "내 게시물" })
    expect(within(grid).queryByRole("listitem")).not.toBeInTheDocument()

    // When: both sections are expanded again.
    fireEvent.click(petsToggle)
    fireEvent.click(postsToggle)

    // Then: their content is visible again.
    expect(screen.getByRole("heading", { level: 3, name: "Bori" })).toBeInTheDocument()
    expect(within(grid).getAllByRole("listitem")).toHaveLength(2)
  })

  it("opens follower and following sheets from the stat buttons", () => {
    render(
      <MemoryRouter>
        <MyRoute />
      </MemoryRouter>,
    )

    // When: the follower count button is activated.
    fireEvent.click(screen.getByRole("button", { name: "팔로워 128명" }))

    // Then: a dialog listing followers opens.
    const dialog = screen.getByRole("dialog", { name: "팔로워 목록" })

    expect(within(dialog).getAllByRole("listitem")).toHaveLength(2)

    // When: the dialog is closed and the following button is activated.
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }))
    fireEvent.click(screen.getByRole("button", { name: "팔로잉 46명" }))

    // Then: a dialog listing followed users opens.
    expect(screen.getByRole("dialog", { name: "팔로잉 목록" })).toBeInTheDocument()
  })
})
