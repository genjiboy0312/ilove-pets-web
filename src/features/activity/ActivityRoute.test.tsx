import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import { ActivityRoute } from "./ActivityRoute"

describe("ActivityRoute", () => {
  beforeEach(async () => {
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("names the route with a level-one Korean heading", () => {
    render(<ActivityRoute />)

    expect(screen.getByRole("heading", { level: 1, name: "활동" })).toBeInTheDocument()
  })

  it("lists every mock notification newest first", () => {
    render(<ActivityRoute />)

    const list = screen.getByRole("list", { name: "알림" })
    const items = within(list).getAllByRole("listitem")

    expect(items).toHaveLength(3)
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringMatching(/Arden Lee/),
      expect.stringMatching(/Solana Park/),
      expect.stringMatching(/Arden Lee/),
    ])
  })

  it("renders translated messages for like, comment, and follow activities", () => {
    render(<ActivityRoute />)

    // When: the three mock activities are rendered in Korean.
    const messages = [
      "Arden Lee님이 팔로우하기 시작했습니다.",
      "Solana Park님이 회원님의 게시물에 댓글을 남겼습니다.",
      "Arden Lee님이 회원님의 게시물을 좋아합니다.",
    ]

    // Then: each translated activity message is visible.
    for (const message of messages) {
      expect(screen.getByText(message)).toBeInTheDocument()
    }
  })

  it("shows the comment preview as a quoted line", () => {
    render(<ActivityRoute />)

    expect(screen.getByText('"That color is perfect."')).toBeInTheDocument()
  })

  it("renders each activity timestamp with a machine-readable date", () => {
    render(<ActivityRoute />)

    const list = screen.getByRole("list", { name: "알림" })
    const times = within(list).getAllByRole("time")

    expect(times).toHaveLength(3)
    expect(times[0]).toHaveAttribute("datetime", "2026-08-18T13:25:00.000Z")
    expect(times[1]).toHaveAttribute("datetime", "2026-08-18T12:10:00.000Z")
    expect(times[2]).toHaveAttribute("datetime", "2026-08-18T10:00:00.000Z")
  })
})
