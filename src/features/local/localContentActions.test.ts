import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  metadataStorageKey,
  createDraftStorageKey,
  readMetadata,
  readCreateDraft,
} from "./localContentMetadata"
import {
  addGrowthRecord,
  addLocalComment,
  deleteGrowthRecord,
  deleteLocalPet,
  deleteLocalPost,
  LinkedPetError,
  resetLocalContent,
  setLocalPostLiked,
  updateLocalPet,
  updateLocalPost,
} from "./localContentActions"
import { publishLocalPost } from "./localContentStore"
import { clearPhotos, deletePhoto, putPhoto } from "./photoStore"
import { commitMetadata } from "./localContentCommit"

vi.mock("./photoStore", () => ({
  clearPhotos: vi.fn(),
  deletePhoto: vi.fn(),
  putPhoto: vi.fn(),
  getPhoto: vi.fn(),
}))

const pet = {
  id: "pet_local_qa",
  name: "Mochi",
  category: "CAT",
  breed: "Mix",
  photoKey: "pet-photo",
  createdAt: "2026-10-10T00:00:00.000Z",
} as const
const post = {
  id: "post_local_qa",
  petId: pet.id,
  photoKey: "post-photo",
  content: "Original",
  tags: ["cat"],
  createdAt: "2026-10-10T00:00:00.000Z",
} as const

describe("local data management", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    localStorage.setItem(metadataStorageKey, JSON.stringify({ pets: [pet], posts: [post] }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("edits pet details and post text without changing photos or identifiers", async () => {
    await updateLocalPet(pet.id, { name: " New name ", breed: " New breed ", category: "DOG" })
    await updateLocalPost(post.id, " Revised ", ["new"])
    expect(readMetadata().pets[0]).toMatchObject({
      id: pet.id,
      name: "New name",
      category: "DOG",
      photoKey: "pet-photo",
    })
    expect(readMetadata().posts[0]).toMatchObject({
      content: "Revised",
      tags: ["new"],
      photoKey: "post-photo",
    })
    expect(putPhoto).not.toHaveBeenCalled()
  })

  it("blocks deletion of pets with linked posts without touching data or photos", async () => {
    const previous = localStorage.getItem(metadataStorageKey)
    await expect(deleteLocalPet(pet.id)).rejects.toBeInstanceOf(LinkedPetError)
    expect(localStorage.getItem(metadataStorageKey)).toBe(previous)
    expect(deletePhoto).not.toHaveBeenCalled()
  })

  it("deletes post photos then allows pet deletion with its avatar", async () => {
    await deleteLocalPost(post.id)
    expect(readMetadata().posts).toEqual([])
    expect(deletePhoto).toHaveBeenCalledWith("post-photo")
    await deleteLocalPet(pet.id)
    expect(readMetadata().pets).toEqual([])
    expect(deletePhoto).toHaveBeenCalledWith("pet-photo")
  })

  it("does not remove a photo if committing deletion fails", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError")
    })
    await expect(deleteLocalPost(post.id)).rejects.toThrow("quota")
    expect(readMetadata().posts).toHaveLength(1)
    expect(deletePhoto).not.toHaveBeenCalled()
  })

  it("persists likes and distinct comments on the same post", async () => {
    await setLocalPostLiked(post.id, true)
    await addLocalComment(post.id, " hello ")
    await addLocalComment(post.id, "second")
    expect(readMetadata().posts[0]).toMatchObject({
      liked: true,
      comments: [{ content: "hello" }, { content: "second" }],
    })
    const comments = readMetadata().posts[0]?.comments ?? []
    expect(new Set(comments.map((comment) => comment.id)).size).toBe(2)
    await setLocalPostLiked(post.id, false)
    expect(readMetadata().posts[0]?.liked).toBe(false)
  })

  it("stores sorted growth records, including care-only records, and removes selected records", async () => {
    await addGrowthRecord(pet.id, { date: "2026-10-10", weightKg: 3.4, note: "checkup" })
    await addGrowthRecord(pet.id, { date: "2026-10-01", note: "grooming" })
    const records = readMetadata().pets[0]?.growth ?? []
    expect(records.map((record) => record.date)).toEqual(["2026-10-01", "2026-10-10"])
    expect(records[1]?.weightKg).toBe(3.4)
    const first = records[0]
    if (first === undefined) throw new Error("Expected saved record")
    await deleteGrowthRecord(pet.id, first.id)
    expect(readMetadata().pets[0]?.growth).toHaveLength(1)
  })

  it.each([
    { date: "2026-02-30", weightKg: 3, note: "" },
    { date: "2026-10-10", weightKg: -1, note: "" },
    { date: "2026-10-10", weightKg: Number.NaN, note: "" },
    { date: "2026-10-10", note: "" },
  ])("rejects invalid growth records before committing: %j", async (record) => {
    await expect(addGrowthRecord(pet.id, record)).rejects.toThrow()
    expect(readMetadata().pets[0]?.growth).toBeUndefined()
  })

  it("cleans up a newly uploaded photo when metadata saving fails", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError")
    })
    await expect(
      publishLocalPost({ petId: pet.id, content: "new", tags: [], image: new Blob(["image"]) }),
    ).rejects.toThrow("quota")
    expect(putPhoto).toHaveBeenCalledOnce()
    expect(deletePhoto).toHaveBeenCalledWith(expect.stringContaining("post-post_local_"))
    expect(readMetadata().posts).toHaveLength(1)
  })

  it("serializes asynchronous commits without Web Locks", async () => {
    await Promise.all([
      commitMetadata(async (metadata) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { ...metadata, posts: [...metadata.posts, { ...post, id: "post_local_a" }] }
      }),
      commitMetadata((metadata) => ({
        ...metadata,
        posts: [...metadata.posts, { ...post, id: "post_local_b" }],
      })),
    ])
    expect(readMetadata().posts.map((item) => item.id)).toEqual([
      post.id,
      "post_local_a",
      "post_local_b",
    ])
  })

  it("recovers corrupt metadata through explicit reset and clears draft and photos only", async () => {
    localStorage.setItem(metadataStorageKey, "{broken")
    localStorage.setItem(createDraftStorageKey, "{draft}")
    localStorage.setItem("ilove-pets-web:theme", "dark")
    await resetLocalContent()
    expect(readMetadata()).toEqual({ pets: [], posts: [] })
    expect(localStorage.getItem(createDraftStorageKey)).toBeNull()
    expect(localStorage.getItem("ilove-pets-web:theme")).toBe("dark")
    expect(clearPhotos).toHaveBeenCalledOnce()
  })

  it("keeps unsupported future schema data intact and restores a broken draft safely", () => {
    localStorage.setItem(metadataStorageKey, '{"schemaVersion":2,"pets":[],"posts":[]}')
    expect(() => readMetadata()).toThrow()
    expect(localStorage.getItem(metadataStorageKey)).toContain('"schemaVersion":2')
    localStorage.setItem(createDraftStorageKey, "{broken")
    expect(readCreateDraft()).toEqual({ petId: "", content: "", tags: "" })
  })
})
