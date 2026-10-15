import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import type { User } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { initializeI18n, i18n } from "../../i18n/i18n"
import { AuthContext } from "../auth/AuthContext"
import type { CloudSnapshot } from "./cloudTypes"
import { CloudRoute } from "./CloudRoute"
import type * as CloudApiModule from "./cloudApi"

const api = vi.hoisted(() => ({
  loadCloud: vi.fn<(owner: string) => Promise<CloudSnapshot>>(),
  cloudMutation: vi.fn(),
  uploadCloudImage: vi.fn(),
  signedCloudImage: vi.fn(),
  cleanupCloudMedia: vi.fn(),
}))
vi.mock("./cloudApi", async (importOriginal) => ({
  ...(await importOriginal<typeof CloudApiModule>()),
  ...api,
}))
const snapshot: CloudSnapshot = {
  mediaReady: true,
  pets: [{ id: "pet-a", name: "Cloud Cat A", category: "CAT", breed: "Mix", version: 1 }],
  posts: [],
  growth: [],
  assets: [],
}
function user(id: string): User {
  return {
    id,
    email: id + "@test.example",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-10-15",
  }
}
function View({ id }: { readonly id: string | null }) {
  return (
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: id ? user(id) : null,
          status: "ready",
          recovering: false,
          clearRecovery: vi.fn(),
        }}
      >
        <CloudRoute />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}
describe("cloud workspace", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    api.loadCloud.mockResolvedValue(snapshot)
    api.cloudMutation.mockResolvedValue(undefined)
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })
  it("requires sign-in without loading any private data", () => {
    render(<View id={null} />)
    expect(screen.getByRole("link", { name: "로그인하고 클라우드 기록 보기" })).toBeInTheDocument()
    expect(api.loadCloud).not.toHaveBeenCalled()
  })
  it("keeps pet and growth forms available while photo processing is not deployed", async () => {
    api.loadCloud.mockResolvedValue({ ...snapshot, mediaReady: false })
    render(<View id="A" />)
    await screen.findByText("Cloud Cat A", { selector: "strong" })
    expect(
      within(screen.getByRole("region", { name: "클라우드 게시물" })).getByRole("button", {
        name: "클라우드에 저장",
      }),
    ).toBeDisabled()
    expect(
      within(screen.getByRole("region", { name: "성장 기록" })).getByRole("button", {
        name: "클라우드에 저장",
      }),
    ).toBeEnabled()
    expect(screen.getByText(/사진 저장 기능을 준비 중/)).toBeInTheDocument()
  })
  it("saves a pet once, preserves inputs on failure and allows retry", async () => {
    render(<View id="A" />)
    await screen.findByText("Cloud Cat A", { selector: "strong" })
    const region = screen.getByRole("region", { name: "클라우드 펫" })
    fireEvent.change(within(region).getByLabelText("펫 이름"), { target: { value: "Mochi" } })
    fireEvent.change(within(region).getByLabelText("품종"), { target: { value: "Mix" } })
    api.cloudMutation.mockRejectedValueOnce(new Error("offline"))
    const form = within(region).getByLabelText("펫 이름").closest("form")
    if (!form) throw new Error("missing form")
    fireEvent.submit(form)
    fireEvent.submit(form)
    await screen.findByRole("alert")
    expect(api.cloudMutation).toHaveBeenCalledTimes(1)
    expect(within(region).getByLabelText("펫 이름")).toHaveValue("Mochi")
    const first: unknown = api.cloudMutation.mock.calls[0]?.[2]
    fireEvent.submit(form)
    await screen.findByText("저장 후 서버 데이터를 갱신했습니다.")
    expect(api.cloudMutation.mock.calls[1]?.[2]).toEqual(first)
  })
  it("clears account A content immediately on switching to B and rejects late A reads", async () => {
    let resolveA: ((value: CloudSnapshot) => void) | undefined
    api.loadCloud.mockImplementation((owner) =>
      owner === "A"
        ? new Promise((resolve) => {
            resolveA = resolve
          })
        : Promise.resolve({
            ...snapshot,
            pets: [{ id: "pet-b", category: "DOG", breed: "Mix", version: 1, name: "Cloud Dog B" }],
          }),
    )
    const view = render(<View id="A" />)
    view.rerender(<View id="B" />)
    await screen.findByText("Cloud Dog B", { selector: "strong" })
    resolveA?.(snapshot)
    await waitFor(() => {
      expect(screen.queryByText("Cloud Cat A")).not.toBeInTheDocument()
    })
    view.rerender(<View id={null} />)
    expect(screen.queryByText("Cloud Dog B")).not.toBeInTheDocument()
  })
  it("keeps post text and reuses a successfully uploaded asset when post saving fails", async () => {
    api.uploadCloudImage.mockResolvedValue("asset-a")
    api.cloudMutation.mockRejectedValueOnce(new Error("post response lost"))
    render(<View id="A" />)
    await screen.findByText("Cloud Cat A", { selector: "strong" })
    const region = screen.getByRole("region", { name: "클라우드 게시물" })
    fireEvent.change(within(region).getByLabelText(/사진 \(/), {
      target: { files: [new File(["bytes"], "photo.png", { type: "image/png" })] },
    })
    fireEvent.change(within(region).getByLabelText("게시물 본문"), {
      target: { value: "Private story" },
    })
    const form = within(region).getByLabelText("게시물 본문").closest("form")
    if (!form) throw new Error("missing form")
    fireEvent.submit(form)
    await screen.findByRole("alert")
    expect(within(region).getByLabelText("게시물 본문")).toHaveValue("Private story")
    fireEvent.submit(form)
    await screen.findByText("저장 후 서버 데이터를 갱신했습니다.")
    expect(api.uploadCloudImage).toHaveBeenCalledTimes(1)
    expect(api.cloudMutation.mock.calls[1]?.[2]).toEqual(api.cloudMutation.mock.calls[0]?.[2])
  })
})
