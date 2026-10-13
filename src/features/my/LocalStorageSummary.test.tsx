import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { initializeI18n, i18n } from "../../i18n/i18n"
import { getPhotoStats } from "../local/photoStore"
import { LocalStorageSummary } from "./LocalStorageSummary"
vi.mock("../local/photoStore", () => ({ getPhotoStats: vi.fn() }))

describe("local storage summary", () => {
  beforeEach(async () => {
    await initializeI18n()
    await i18n.changeLanguage("ko")
    vi.mocked(getPhotoStats).mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it("shows stored photo bytes without counting demo data", async () => {
    vi.mocked(getPhotoStats).mockResolvedValue({ count: 2, bytes: 3 * 1024 * 1024 })
    render(
      <LocalStorageSummary
        snapshot={{ status: "ready", errorMessage: null, content: { pets: [], posts: [] } }}
      />,
    )
    await waitFor(() => expect(screen.getByText("저장된 사진 2장 (3.0MB)")).toBeVisible())
    expect(screen.getByText("펫 0마리 · 게시물 0개 · 성장 기록 0개")).toBeVisible()
  })
  it("keeps backup-first guidance usable when storage statistics fail", async () => {
    vi.mocked(getPhotoStats).mockRejectedValue(new Error("unavailable"))
    render(
      <LocalStorageSummary
        snapshot={{ status: "error", errorMessage: "failed", content: { pets: [], posts: [] } }}
      />,
    )
    await waitFor(() => {
      expect(getPhotoStats).toHaveBeenCalled()
    })
    expect(screen.getByText(/사진 포함 백업을 다운로드/)).toBeVisible()
    expect(screen.getByRole("button", { name: "저장 상태 다시 확인" })).toBeEnabled()
  })
})
