import type * as CloudApiModule from "../cloud/cloudApi"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { importItems, importOne } from "./importApi"
import type { ImportItem } from "./importApi"
const api = vi.hoisted(() => ({ rpc: vi.fn(), cloudMutation: vi.fn(), uploadCloudImage: vi.fn() }))
vi.mock("../cloud/cloudApi", async (original) => ({
  ...(await original<typeof CloudApiModule>()),
  accountClient: vi.fn(() => Promise.resolve({ rpc: api.rpc })),
  cloudMutation: api.cloudMutation,
  uploadCloudImage: api.uploadCloudImage,
}))
const item: ImportItem = {
  kind: "pet",
  source: "pet_local_one",
  petSource: "pet_local_one",
  label: "Pet",
  payload: { name: "Pet", category: "CAT", breed: "Mix" },
  photo: undefined,
}
describe("private import orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it("skips a completed receipt without rewriting or uploading", async () => {
    api.rpc.mockResolvedValue({
      data: { id: "receipt", target_id: "target", completed_at: "2026-10-15" },
      error: null,
    })
    expect(await importOne("owner", item, null, () => undefined)).toBe("target")
    expect(api.cloudMutation).not.toHaveBeenCalled()
    expect(api.uploadCloudImage).not.toHaveBeenCalled()
  })
  it("stops after a pending request if the account changed or route unmounted", async () => {
    let cancelled = false
    api.rpc.mockImplementation(() => {
      cancelled = true
      return Promise.resolve({
        data: { id: "receipt", target_id: "target", completed_at: null },
        error: null,
      })
    })
    await expect(
      importOne("owner", item, null, () => {
        if (cancelled) throw new Error("stopped")
      }),
    ).rejects.toThrow("stopped")
    expect(api.cloudMutation).not.toHaveBeenCalled()
    expect(api.uploadCloudImage).not.toHaveBeenCalled()
  })
  it("excludes storage keys from identity and retains local comments as private payload", () => {
    const photo = new Blob(["photo"], { type: "image/png" })
    const backup = {
      metadata: {
        pets: [],
        posts: [
          {
            id: "post_one" as const,
            petId: "pet_bori" as const,
            content: "Post",
            tags: ["pet"],
            photoKey: "renamed-storage-key",
            createdAt: "2026-10-01T00:00:00.000Z" as const,
            comments: [
              {
                id: "note",
                content: "Private note",
                createdAt: "2026-10-01T00:00:00.000Z" as const,
              },
            ],
          },
        ],
      },
      photos: new Map([["renamed-storage-key", photo]]),
      photoBytes: 5,
    }
    const result = importItems(backup)
    expect(result[0]?.source).toBe("post_one")
    expect(result[0]?.payload).not.toHaveProperty("photoKey")
    expect(result[0]?.payload["comments"]).toEqual(backup.metadata.posts[0]?.comments)
    expect(result[0]?.photo).toBe(photo)
  })
})
