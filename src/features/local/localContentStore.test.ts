import { beforeEach, describe, expect, it, vi } from "vitest"

import { metadataStorageKey } from "./localContentMetadata"

vi.mock("./photoStore", () => ({
  deletePhoto: vi.fn(),
  getPhoto: vi.fn((key: string) =>
    Promise.resolve(key === "missing-photo" ? null : new Blob(["ok"])),
  ),
  putPhoto: vi.fn(),
}))

const localContentStore = await import("./localContentStore")

describe("loadLocalContent", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) =>
      blob instanceof Blob ? `blob:qa-${String(blob.size)}` : "blob:qa-media",
    )
  })

  it("preserves unaffected local records when one committed post photo is missing", async () => {
    localStorage.setItem(
      metadataStorageKey,
      JSON.stringify({
        pets: [
          {
            id: "pet_local_mochi",
            name: "Mochi",
            category: "CAT",
            breed: "Korean shorthair",
            createdAt: "2026-10-10T10:00:00.000Z",
          },
        ],
        posts: [
          {
            id: "post_local_ok",
            petId: "pet_local_mochi",
            photoKey: "ok-photo",
            content: "Visible local post",
            tags: ["ok"],
            createdAt: "2026-10-10T10:05:00.000Z",
          },
          {
            id: "post_local_missing",
            petId: "pet_local_mochi",
            photoKey: "missing-photo",
            content: "Missing photo post",
            tags: ["missing"],
            createdAt: "2026-10-10T10:06:00.000Z",
          },
        ],
      }),
    )

    const result = await localContentStore.loadLocalContent()

    expect(result.content.pets.map((pet) => pet.petId)).toEqual(["pet_local_mochi"])
    expect(result.content.posts.map((post) => post.postId)).toEqual(["post_local_ok"])
    expect(result.warningMessage).toContain("1 saved post photo")
    expect(localStorage.getItem(metadataStorageKey)).toContain("post_local_missing")
  })
})
