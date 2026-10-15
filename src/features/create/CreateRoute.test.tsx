import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { i18n, initializeI18n } from "../../i18n/i18n"
import type * as LocalContentStoreModule from "../local/localContentStore"
import { CreateRoute } from "./CreateRoute"
import { MemoryRouter } from "react-router"

vi.mock("../local/localContentStore", async (importOriginal) => {
  const actual = await importOriginal<typeof LocalContentStoreModule>()
  return {
    ...actual,
    publishLocalPost: vi.fn(actual.publishLocalPost),
  }
})

const localContentStore = await import("../local/localContentStore")

describe("CreateRoute", () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.resolve({ close: vi.fn() })),
    )
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("names the route with a level-one Korean heading", () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "작성" })).toBeInTheDocument()
  })

  it("renders a photo picker with translated hint", () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    expect(screen.getByText("사진 추가")).toBeInTheDocument()
    expect(screen.getByLabelText("사진")).toHaveAttribute("type", "file")
  })

  it("lists the current user's pets in the pet selector", () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    const petSelect = screen.getByRole("combobox", { name: "펫" })
    const options = withinSelectOptions(petSelect)

    expect(options).toEqual(["펫 선택", "Bori", "Miso"])
  })

  it("renders content and tag fields with translated placeholders", () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("button", { name: "게시" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "사진은 이 브라우저의 IndexedDB에 저장됩니다. 사이트 데이터를 지우면 삭제됩니다.",
      ),
    ).toBeInTheDocument()
  })

  it("suggests AI captions and fills the content on pick", () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    // When: the AI caption button is activated.
    fireEvent.click(screen.getByRole("button", { name: /AI 캡션 추천/ }))

    // Then: it first shows the generating state.
    expect(screen.getByRole("button", { name: "생성 중..." })).toBeDisabled()

    // When: the fake generation delay passes.
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Then: three suggestion chips appear and picking one fills the content.
    const suggestions = within(screen.getByRole("group", { name: "AI 캡션 추천" })).getAllByRole(
      "button",
    )
    expect(suggestions).toHaveLength(3)

    const firstSuggestion = suggestions[0]

    if (firstSuggestion === undefined) {
      throw new Error("Expected at least one AI suggestion.")
    }

    fireEvent.click(firstSuggestion)
    expect(screen.getByRole("textbox", { name: "내용" })).toHaveValue("오늘 산책, 최고의 하루 🐾")
  })

  it("restores text, selected pet, and tags draft after remount", () => {
    const { unmount } = render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole("combobox", { name: "펫" }), {
      target: { value: "pet_bori" },
    })
    fireEvent.change(screen.getByRole("textbox", { name: "내용" }), {
      target: { value: "Bori local draft" },
    })
    fireEvent.change(screen.getByRole("textbox", { name: "태그" }), {
      target: { value: "bori draft" },
    })

    unmount()
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    expect(screen.getByRole("combobox", { name: "펫" })).toHaveValue("pet_bori")
    expect(screen.getByRole("textbox", { name: "내용" })).toHaveValue("Bori local draft")
    expect(screen.getByRole("textbox", { name: "태그" })).toHaveValue("bori draft")
  })

  it("shows draft storage errors without crashing", () => {
    // Given: localStorage refuses draft writes.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Draft quota exceeded", "QuotaExceededError")
    })

    // When: the user edits the draft content.
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByRole("textbox", { name: "내용" }), {
      target: { value: "Bori local draft" },
    })

    // Then: the route remains mounted and reports the storage failure.
    expect(screen.getByRole("alert")).toHaveTextContent("로컬 데이터에 접근하지 못했습니다")
  })

  it("keeps publish success visible when clearing the draft fails", async () => {
    // Given: publishing succeeds but localStorage refuses draft removal.
    vi.mocked(localContentStore.publishLocalPost).mockResolvedValue("post_local_test")
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Draft clear blocked", "SecurityError")
    })
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>,
    )

    // When: the user completes and submits the form.
    fireEvent.change(screen.getByRole("combobox", { name: "펫" }), {
      target: { value: "pet_bori" },
    })
    fireEvent.change(screen.getByRole("textbox", { name: "내용" }), {
      target: { value: "Bori posted" },
    })
    fireEvent.change(screen.getByLabelText("사진"), {
      target: { files: [new File(["photo"], "bori.png", { type: "image/png" })] },
    })
    const submitButton = screen.getByRole("button", { name: "게시" })
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    fireEvent.click(submitButton)

    // Then: clear failure does not convert a completed publish into an error state.
    expect(await screen.findByRole("status")).toHaveTextContent("로컬 게시되었습니다")
  })
})

function withinSelectOptions(select: HTMLElement): string[] {
  const options = (select as HTMLSelectElement).options
  return Array.from(options, (option) => option.textContent)
}
