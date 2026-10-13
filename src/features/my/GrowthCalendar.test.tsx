import { render, screen, fireEvent } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { initializeI18n, i18n } from "../../i18n/i18n"
import { GrowthCalendar } from "./GrowthCalendar"
import { isGrowthInputValid, localDate } from "../local/growthDates"

describe("growth calendar dates", () => {
  beforeEach(async () => {
    await initializeI18n()
    await i18n.changeLanguage("ko")
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 1, 29, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it("uses the user's local date and rejects invalid or future observations", () => {
    expect(localDate(new Date(2024, 1, 29, 23, 59))).toBe("2024-02-29")
    expect(isGrowthInputValid({ date: "2024-02-29", note: "care" })).toBe(true)
    for (const date of ["2023-02-29", "2024-02-30", "2024-03-01"])
      expect(isGrowthInputValid({ date, note: "care" })).toBe(false)
  })
  it("handles leap days, year boundaries, empty dates and today navigation", () => {
    render(
      <GrowthCalendar
        records={[{ id: "one", date: "2024-02-29", weightKg: 3, note: "checkup" }]}
      />,
    )
    expect(screen.getByRole("button", { name: "2024-02-29 (1)" })).toHaveAttribute(
      "aria-current",
      "date",
    )
    expect(screen.getByText(/checkup/)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "2024-02-28 (0)" }))
    expect(screen.getByText("이 날짜에는 기록이 없습니다.")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "이전 달" }))
    fireEvent.click(screen.getByRole("button", { name: "이전 달" }))
    expect(screen.getByRole("button", { name: "2023-12-31 (0)" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "오늘로 이동" }))
    expect(screen.getByRole("button", { name: "2024-02-29 (1)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })
})
