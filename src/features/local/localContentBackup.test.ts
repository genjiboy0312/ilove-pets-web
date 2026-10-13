import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  BackupError,
  exportLocalBackup,
  prepareLocalBackup,
  restoreLocalBackup,
} from "./localContentBackup"
import { metadataStorageKey, readMetadata } from "./localContentMetadata"
import { deletePhoto, getPhoto, putPhotos } from "./photoStore"

vi.mock("./photoStore", () => ({ getPhoto: vi.fn(), putPhotos: vi.fn(), deletePhoto: vi.fn() }))
const pet = {
  id: "pet_local_test",
  name: "Mochi",
  category: "CAT",
  breed: "Mix",
  createdAt: "2026-10-10T00:00:00.000Z",
  growth: [{ id: "growth1", date: "2026-10-10", note: "checkup", weightKg: 3.4 }],
}
const post = {
  id: "post_local_test",
  petId: pet.id,
  content: "Photo",
  tags: ["cat"],
  photoKey: "photo1",
  createdAt: pet.createdAt,
  liked: true,
  comments: [{ id: "comment1", content: "Hi", createdAt: pet.createdAt }],
}
const original = { schemaVersion: 1, pets: [pet], posts: [post] }
const image = "data:image/png;base64,aW1hZ2U="
const backup = {
  format: "ilove-pets-backup",
  version: 1,
  metadata: original,
  photos: [{ key: "photo1", data: image }],
}

function file(value: unknown): File {
  const text = JSON.stringify(value)
  const result = new File([text], "backup.json", { type: "application/json" })
  // jsdom File does not implement Blob.text; production browsers do.
  Object.defineProperty(result, "text", { value: () => Promise.resolve(text) })
  return result
}

describe("local backups", () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(metadataStorageKey, JSON.stringify(original))
    vi.clearAllMocks()
    vi.mocked(getPhoto).mockResolvedValue(new Blob(["image"], { type: "image/png" }))
    vi.mocked(putPhotos).mockResolvedValue(undefined)
    vi.mocked(deletePhoto).mockResolvedValue(undefined)
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ close: vi.fn() }))
    vi.stubGlobal("navigator", {
      locks: {
        request: async (_name: string, callback: () => Promise<unknown>) => await callback(),
      },
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it("exports all metadata and photo bytes without settings or draft data", async () => {
    localStorage.setItem("i18nextLng", "ja")
    const blob = await exportLocalBackup()
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : "")
      }
      reader.readAsText(blob)
    })
    expect(JSON.parse(text)).toEqual(backup)
  })

  it("validates, stages photos with new keys and preserves IDs, reactions and growth on restore", async () => {
    const prepared = await prepareLocalBackup(file(backup))
    expect(prepared.photos.size).toBe(1)
    expect(prepared.photoBytes).toBe(5)
    await restoreLocalBackup(prepared)
    expect(readMetadata().pets[0]).toEqual(pet)
    expect(readMetadata().posts[0]).toMatchObject({
      id: post.id,
      liked: true,
      comments: post.comments,
    })
    expect(readMetadata().posts[0]?.photoKey).toMatch(/^restore-/)
    expect(deletePhoto).toHaveBeenCalledWith("photo1")
  })

  it("preserves existing metadata and photos on metadata quota failure", async () => {
    const prepared = await prepareLocalBackup(file(backup))
    const previous = localStorage.getItem(metadataStorageKey)
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError")
    })
    await expect(restoreLocalBackup(prepared)).rejects.toBeInstanceOf(BackupError)
    expect(localStorage.getItem(metadataStorageKey)).toBe(previous)
    expect(deletePhoto).not.toHaveBeenCalledWith("photo1")
    expect(deletePhoto).toHaveBeenCalledWith(expect.stringMatching(/^restore-/))
  })

  it("preserves existing data on photo staging failure", async () => {
    const prepared = await prepareLocalBackup(file(backup))
    vi.mocked(putPhotos).mockRejectedValueOnce(new Error("IDB failed"))
    await expect(restoreLocalBackup(prepared)).rejects.toThrow()
    expect(readMetadata().posts[0]?.photoKey).toBe("photo1")
    expect(deletePhoto).not.toHaveBeenCalledWith("photo1")
  })

  it("does not misreport a committed restore if old photo cleanup fails", async () => {
    const prepared = await prepareLocalBackup(file(backup))
    vi.mocked(deletePhoto).mockRejectedValueOnce(new Error("cleanup failed"))
    await expect(restoreLocalBackup(prepared)).resolves.toBeUndefined()
    expect(readMetadata().posts[0]?.photoKey).toMatch(/^restore-/)
  })

  it.each([
    { ...backup, version: 2 },
    { ...backup, format: "other" },
    { ...backup, metadata: { ...original, pets: [] } },
    { ...backup, metadata: { ...original, pets: [pet, pet] } },
    { ...backup, metadata: { ...original, posts: [{ ...post, content: "" }] } },
    { ...backup, photos: [] },
    { ...backup, photos: [backup.photos[0], backup.photos[0]] },
    { ...backup, photos: [{ key: "photo1", data: "data:image/svg+xml;base64,aW1hZ2U=" }] },
    {
      ...backup,
      metadata: {
        ...original,
        pets: [{ ...pet, growth: [{ id: "bad", date: "2026-02-30", note: "bad" }] }],
      },
    },
  ])("rejects invalid backups without writing any data: %j", async (value) => {
    const previous = localStorage.getItem(metadataStorageKey)
    await expect(prepareLocalBackup(file(value))).rejects.toThrow()
    expect(localStorage.getItem(metadataStorageKey)).toBe(previous)
    expect(putPhotos).not.toHaveBeenCalled()
  })

  it("refuses export if a referenced photo is missing", async () => {
    vi.mocked(getPhoto).mockResolvedValueOnce(null)
    await expect(exportLocalBackup()).rejects.toMatchObject({ reason: "missingPhoto" })
  })

  it("does not silently export a partial backup from salvaged metadata", async () => {
    localStorage.setItem(
      metadataStorageKey,
      JSON.stringify({ ...original, pets: [pet, { ...pet, id: "pet_invalid", name: "" }] }),
    )
    await expect(exportLocalBackup()).rejects.toMatchObject({ reason: "invalid" })
    expect(localStorage.getItem(metadataStorageKey)).toContain("pet_invalid")
  })

  it("checks the file size before reading its contents", async () => {
    const oversized = file(backup)
    Object.defineProperty(oversized, "size", { value: 101 * 1024 * 1024 })
    await expect(prepareLocalBackup(oversized)).rejects.toMatchObject({ reason: "size" })
  })

  it("rejects non-decodable image content", async () => {
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error("decode failed"))
    await expect(prepareLocalBackup(file(backup))).rejects.toMatchObject({ reason: "invalid" })
  })

  it("requires a cross-tab lock before replacing data", async () => {
    const prepared = await prepareLocalBackup(file(backup))
    vi.stubGlobal("navigator", {})
    await expect(restoreLocalBackup(prepared)).rejects.toMatchObject({ reason: "storage" })
    expect(putPhotos).not.toHaveBeenCalled()
  })
})
