import { CURRENT_USER_ID, mockPetsById } from "../../mocks/mockData"
import type { PetId } from "../../types/domain"
import { withMetadataLock } from "./localContentCommit"
import { emitLocalContentChanged } from "./localContentStore"
import {
  metadataStorageKey,
  parseMetadata,
  readMetadata,
  writeMetadata,
} from "./localContentMetadata"
import type { StoredMetadata } from "./localContentMetadata"
import { deletePhoto, getPhoto, putPhotos } from "./photoStore"
import { maxImageBytes, validateImageFile } from "./imageValidation"

export const maxBackupBytes = 100 * 1024 * 1024
const maxPhotoBytes = 64 * 1024 * 1024
const backupFormat = "ilove-pets-backup"

export class BackupError extends Error {
  constructor(readonly reason: "invalid" | "version" | "size" | "missingPhoto" | "storage") {
    super(reason)
  }
}

export interface PreparedBackup {
  readonly metadata: StoredMetadata
  readonly photos: ReadonlyMap<string, Blob>
  readonly photoBytes: number
}

function photoKeys(metadata: StoredMetadata): readonly string[] {
  return [
    ...new Set([
      ...metadata.pets.flatMap((pet) => (pet.photoKey === undefined ? [] : [pet.photoKey])),
      ...metadata.posts.map((post) => post.photoKey),
    ]),
  ]
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function strictMetadata(value: unknown): StoredMetadata {
  const metadata = parseMetadata(value)
  // The normal local reader salvages valid records. Imports must never silently drop data.
  if (canonical(value) !== canonical({ schemaVersion: 1, ...metadata }))
    throw new BackupError("invalid")
  const petIds = new Set(metadata.pets.map((pet) => pet.id))
  if (
    petIds.size !== metadata.pets.length ||
    new Set(metadata.posts.map((post) => post.id)).size !== metadata.posts.length
  )
    throw new BackupError("invalid")
  const ownedDemoIds = new Set<PetId>(
    Object.values(mockPetsById)
      .filter((pet) => pet.ownerId === CURRENT_USER_ID)
      .map((pet) => pet.id),
  )
  for (const post of metadata.posts) {
    if (!petIds.has(post.petId) && !ownedDemoIds.has(post.petId)) throw new BackupError("invalid")
    if (new Set(post.comments?.map((comment) => comment.id)).size !== (post.comments?.length ?? 0))
      throw new BackupError("invalid")
  }
  for (const pet of metadata.pets) {
    if (new Set(pet.growth?.map((record) => record.id)).size !== (pet.growth?.length ?? 0))
      throw new BackupError("invalid")
  }
  return metadata
}

async function readAsDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new BackupError("invalid"))
    }
    reader.onerror = () => {
      reject(new BackupError("storage"))
    }
    reader.readAsDataURL(blob)
  })
}

export async function exportLocalBackup(): Promise<Blob> {
  return await withMetadataLock(async () => {
    const metadata = readMetadata()
    const raw = localStorage.getItem(metadataStorageKey)
    if (raw !== null) {
      const value: unknown = JSON.parse(raw)
      if (value === null || typeof value !== "object" || Array.isArray(value))
        throw new BackupError("invalid")
      strictMetadata({ schemaVersion: 1, ...value })
    }
    const photos: { key: string; data: string }[] = []
    let photoBytes = 0
    for (const key of photoKeys(metadata)) {
      const blob = await getPhoto(key)
      if (blob === null) throw new BackupError("missingPhoto")
      photoBytes += blob.size
      if (photoBytes > maxPhotoBytes || blob.size > maxImageBytes) throw new BackupError("size")
      photos.push({ key, data: await readAsDataUrl(blob) })
    }
    const file = new Blob(
      [
        JSON.stringify({
          format: backupFormat,
          version: 1,
          metadata: { schemaVersion: 1, ...metadata },
          photos,
        }),
      ],
      { type: "application/json" },
    )
    if (file.size > maxBackupBytes) throw new BackupError("size")
    return file
  })
}

export async function prepareLocalBackup(file: File): Promise<PreparedBackup> {
  if (file.size > maxBackupBytes) throw new BackupError("size")
  try {
    const value: unknown = JSON.parse(await file.text())
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new BackupError("invalid")
    const backup = value as Record<string, unknown>
    if (backup["format"] !== backupFormat) throw new BackupError("invalid")
    if (backup["version"] !== 1) throw new BackupError("version")
    const metadata = strictMetadata(backup["metadata"])
    if (!Array.isArray(backup["photos"])) throw new BackupError("invalid")
    const requiredKeys = new Set(photoKeys(metadata))
    const photos = new Map<string, Blob>()
    let photoBytes = 0
    for (const item of backup["photos"] as unknown[]) {
      if (item === null || typeof item !== "object") throw new BackupError("invalid")
      const photo = item as Record<string, unknown>
      const key = photo["key"]
      const data = photo["data"]
      if (
        typeof key !== "string" ||
        !requiredKeys.has(key) ||
        photos.has(key) ||
        typeof data !== "string"
      )
        throw new BackupError("invalid")
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data)
      if (match?.[1] === undefined || match[2] === undefined) throw new BackupError("invalid")
      if (match[2].length > Math.ceil(maxImageBytes / 3) * 4) throw new BackupError("size")
      const binary = atob(match[2])
      if (btoa(binary) !== match[2]) throw new BackupError("invalid")
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
      const image = new File([bytes], "backup-photo", { type: match[1] })
      photoBytes += image.size
      if (photoBytes > maxPhotoBytes || image.size > maxImageBytes) throw new BackupError("size")
      if ((await validateImageFile(image)).kind !== "valid") throw new BackupError("invalid")
      photos.set(key, image)
    }
    if (photos.size !== requiredKeys.size) throw new BackupError("missingPhoto")
    return { metadata, photos, photoBytes }
  } catch (error) {
    if (error instanceof BackupError) throw error
    throw new BackupError("invalid")
  }
}

export async function restoreLocalBackup(backup: PreparedBackup): Promise<void> {
  // The shared lock excludes all normal writes and reset while staging and switching metadata.
  // Without Web Locks, a same-tab queue cannot protect a replacement from another tab.
  if (!("locks" in navigator)) throw new BackupError("storage")
  await withMetadataLock(async () => {
    const previous = localStorage.getItem(metadataStorageKey)
    const staged = new Map<string, Blob>()
    const renamedKeys = new Map<string, string>()
    for (const [key, blob] of backup.photos) {
      const stagedKey = `restore-${crypto.randomUUID()}`
      renamedKeys.set(key, stagedKey)
      staged.set(stagedKey, blob)
    }
    const renamed = (key: string) => renamedKeys.get(key) ?? key
    const metadata: StoredMetadata = {
      pets: backup.metadata.pets.map((pet) => ({
        ...pet,
        ...(pet.photoKey === undefined ? {} : { photoKey: renamed(pet.photoKey) }),
      })),
      posts: backup.metadata.posts.map((post) => ({ ...post, photoKey: renamed(post.photoKey) })),
    }
    try {
      await putPhotos(staged)
      // localStorage setItem is atomic. Until this succeeds all previous photos remain intact.
      writeMetadata(metadata)
    } catch {
      await Promise.allSettled([...staged.keys()].map((key) => deletePhoto(key)))
      throw new BackupError("storage")
    }
    // Cleanup is best-effort after the commit; a cleanup failure must not misreport a successful restore.
    if (previous !== null) {
      try {
        const parsed: unknown = JSON.parse(previous)
        await Promise.allSettled(photoKeys(parseMetadata(parsed)).map((key) => deletePhoto(key)))
      } catch {
        /* Corrupt previous metadata has no safely identifiable photo references. */
      }
    }
  })
  emitLocalContentChanged()
}
