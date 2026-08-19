import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { CategoryTabs } from "./CategoryTabs"

describe("CategoryTabs", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("renders Korean category buttons in product order", () => {
    const onSelectFilter = vi.fn()

    render(<CategoryTabs selectedFilter="ALL" onSelectFilter={onSelectFilter} />)

    const categorySection = screen.getByRole("region", { name: "반려동물 카테고리" })
    const buttons = within(categorySection).getAllByRole("button")

    expect(buttons.map((button) => button.textContent)).toEqual([
      "전체",
      "강아지",
      "고양이",
      "파충류",
      "조류",
      "소동물",
      "기타",
    ])
  })

  it("marks the selected DOG category with pressed state and selected class", () => {
    const onSelectFilter = vi.fn()

    render(<CategoryTabs selectedFilter="DOG" onSelectFilter={onSelectFilter} />)

    const dogButton = screen.getByRole("button", { name: "강아지" })
    const catButton = screen.getByRole("button", { name: "고양이" })

    expect(dogButton).toHaveAttribute("aria-pressed", "true")
    expect(dogButton).toHaveClass("home-category-strip__button--selected")
    expect(catButton).toHaveAttribute("aria-pressed", "false")
    expect(catButton).not.toHaveClass("home-category-strip__button--selected")
  })

  it("calls onSelectFilter with CAT when the CAT category is clicked", () => {
    const onSelectFilter = vi.fn()

    render(<CategoryTabs selectedFilter="ALL" onSelectFilter={onSelectFilter} />)

    fireEvent.click(screen.getByRole("button", { name: "고양이" }))

    expect(onSelectFilter).toHaveBeenCalledTimes(1)
    expect(onSelectFilter).toHaveBeenCalledWith("CAT")
  })

  it("renders category controls as buttons, not links", () => {
    const onSelectFilter = vi.fn()

    render(<CategoryTabs selectedFilter="ALL" onSelectFilter={onSelectFilter} />)

    const categorySection = screen.getByRole("region", { name: "반려동물 카테고리" })

    expect(within(categorySection).getAllByRole("button")).toHaveLength(7)
    expect(within(categorySection).queryAllByRole("link")).toHaveLength(0)
  })
})
