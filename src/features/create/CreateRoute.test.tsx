import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { CreateRoute } from "./CreateRoute"

describe("CreateRoute", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("names the route with a level-one Korean heading", () => {
    render(<CreateRoute />)

    expect(screen.getByRole("heading", { level: 1, name: "작성" })).toBeInTheDocument()
  })

  it("renders a photo picker button with translated hint", () => {
    render(<CreateRoute />)

    expect(screen.getByRole("button", { name: "사진 추가" })).toBeInTheDocument()
  })

  it("lists the current user's pets in the pet selector", () => {
    render(<CreateRoute />)

    const petSelect = screen.getByRole("combobox", { name: "펫" })
    const options = withinSelectOptions(petSelect)

    expect(options).toEqual(["펫 선택", "Bori", "Miso"])
  })

  it("renders content and tag fields with translated placeholders", () => {
    render(<CreateRoute />)

    expect(screen.getByRole("textbox", { name: "내용" })).toHaveAttribute(
      "placeholder",
      "반려동물의 근황을 적어보세요",
    )
    expect(screen.getByRole("textbox", { name: "태그" })).toHaveAttribute(
      "placeholder",
      "태그 추가",
    )
  })

  it("renders the post submit button and upload hint", () => {
    render(<CreateRoute />)

    expect(screen.getByRole("button", { name: "게시" })).toBeInTheDocument()
    expect(screen.getByText("업로드는 나중에 연결됩니다.")).toBeInTheDocument()
  })
})

function withinSelectOptions(select: HTMLElement): string[] {
  const options = (select as HTMLSelectElement).options
  return Array.from(options, (option) => option.textContent)
}
