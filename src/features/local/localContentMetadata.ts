import { PET_CATEGORY_IDS } from "../../constants/petCategories"
import type { PetCategory } from "../../constants/petCategories"
import type { IsoDateTimeString, PetId, PostId } from "../../types/domain"
import type { CreateDraft, GrowthRecord, LocalComment } from "./localContentTypes"
import { LocalContentMetadataError } from "./localContentErrors"

const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export const metadataStorageKey = "ilove-pets-web:local-content:v1"
export const createDraftStorageKey = "ilove-pets-web:create-draft:v1"

export interface StoredMetadata {
  readonly pets: readonly StoredPet[]
  readonly posts: readonly StoredPost[]
}

export interface StoredPet {
  readonly id: PetId
  readonly name: string
  readonly category: PetCategory
  readonly breed: string
  readonly photoKey?: string
  readonly createdAt: IsoDateTimeString
  readonly growth?: readonly GrowthRecord[]
}

export interface StoredPost {
  readonly liked?: boolean
  readonly comments?: readonly LocalComment[]
  readonly id: PostId
  readonly petId: PetId
  readonly photoKey: string
  readonly content: string
  readonly tags: readonly string[]
  readonly createdAt: IsoDateTimeString
}

export function createEmptyMetadata(): StoredMetadata {
  return { pets: [], posts: [] }
}

export function readMetadata(): StoredMetadata {
  const raw = window.localStorage.getItem(metadataStorageKey)

  if (raw === null) {
    return createEmptyMetadata()
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return parseMetadata(parsed)
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof LocalContentMetadataError) {
      throw new LocalContentMetadataError(
        "Local content metadata is unreadable. Export or clear site data before saving again.",
      )
    }
    throw error
  }
}

export function writeMetadata(metadata: StoredMetadata): void {
  window.localStorage.setItem(metadataStorageKey, JSON.stringify({ schemaVersion: 1, ...metadata }))
}

export function canPrunePhotos(metadata: StoredMetadata): boolean {
  const raw = window.localStorage.getItem(metadataStorageKey)
  if (raw === null) return true
  const value: unknown = JSON.parse(raw)
  if (!isRecord(value)) return false
  const pets: unknown = value["pets"]
  const posts: unknown = value["posts"]
  // Salvaged metadata may have hidden invalid records. Preserve their photos for recovery.
  return (
    Array.isArray(pets) &&
    Array.isArray(posts) &&
    pets.length === metadata.pets.length &&
    posts.length === metadata.posts.length
  )
}

export function readCreateDraft(): CreateDraft {
  const fallback: CreateDraft = { petId: "", content: "", tags: "" }
  try {
    const raw = window.localStorage.getItem(createDraftStorageKey)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return parseCreateDraft(parsed) ?? fallback
  } catch {
    return fallback
  }
}

export function writeCreateDraft(draft: CreateDraft): void {
  window.localStorage.setItem(createDraftStorageKey, JSON.stringify(draft))
}

export function clearCreateDraft(): void {
  window.localStorage.removeItem(createDraftStorageKey)
}

export function toIsoDateTimeString(date: Date): IsoDateTimeString {
  const value = date.toISOString()
  return isIsoDateTimeString(value) ? value : "1970-01-01T00:00:00.000Z"
}

export function parsePetId(value: unknown): PetId | null {
  return parsePrefixedId(value, "pet_")
}

export function parsePostId(value: unknown): PostId | null {
  return parsePrefixedId(value, "post_")
}

export function parseMetadata(value: unknown): StoredMetadata {
  if (!isRecord(value)) {
    throw new LocalContentMetadataError("Local metadata shape is invalid.")
  }

  if (value["schemaVersion"] !== undefined && value["schemaVersion"] !== 1)
    throw new LocalContentMetadataError("Unsupported local data version.")
  return {
    pets: parseArray(value["pets"], parseStoredPet),
    posts: parseArray(value["posts"], parseStoredPost),
  }
}

function parseStoredPet(value: unknown): StoredPet | null {
  if (!isRecord(value)) {
    return null
  }

  const id = parsePetId(value["id"])
  const name = parseNonEmptyString(value["name"])
  const category = parsePetCategory(value["category"])
  const breed = parseNonEmptyString(value["breed"])
  const createdAt = parseIsoDateTime(value["createdAt"])
  const photoKey = parseOptionalString(value["photoKey"])
  const growth =
    value["growth"] === undefined ? undefined : parseArray(value["growth"], parseGrowthRecord)

  if (id === null || name === null || category === null || breed === null || createdAt === null) {
    return null
  }

  return {
    id,
    name,
    category,
    breed,
    createdAt,
    ...(photoKey === undefined ? {} : { photoKey }),
    ...(growth === undefined ? {} : { growth }),
  }
}

function parseStoredPost(value: unknown): StoredPost | null {
  if (!isRecord(value)) {
    return null
  }

  const id = parsePostId(value["id"])
  const petId = parsePetId(value["petId"])
  const photoKey = parseNonEmptyString(value["photoKey"])
  const content = parseNonEmptyString(value["content"])
  const tags = parseArray(value["tags"], parseNonEmptyString)
  const createdAt = parseIsoDateTime(value["createdAt"])

  if (
    id === null ||
    petId === null ||
    photoKey === null ||
    content === null ||
    createdAt === null
  ) {
    return null
  }

  const comments =
    value["comments"] === undefined ? undefined : parseArray(value["comments"], parseLocalComment)
  return {
    id,
    petId,
    photoKey,
    content,
    tags,
    createdAt,
    ...(typeof value["liked"] === "boolean" ? { liked: value["liked"] } : {}),
    ...(comments === undefined ? {} : { comments }),
  }
}

function parseCreateDraft(value: unknown): CreateDraft | null {
  if (!isRecord(value)) {
    return null
  }

  const petId = value["petId"] === "" ? "" : parsePetId(value["petId"])
  const content = typeof value["content"] === "string" ? value["content"] : null
  const tags = typeof value["tags"] === "string" ? value["tags"] : null

  if (petId === null || content === null || tags === null) {
    return null
  }

  return { petId, content, tags }
}

function parseArray<T>(value: unknown, parser: (item: unknown) => T | null): readonly T[] {
  if (!Array.isArray(value)) {
    throw new LocalContentMetadataError("Local metadata list is invalid.")
  }

  return value.flatMap((item) => {
    const parsed = parser(item)
    return parsed === null ? [] : [parsed]
  })
}

function parsePrefixedId<TPrefix extends "pet_" | "post_">(
  value: unknown,
  prefix: TPrefix,
): `${TPrefix}${string}` | null {
  if (typeof value !== "string" || !value.startsWith(prefix)) {
    return null
  }

  const suffix = value.slice(prefix.length).replace(/[^a-zA-Z0-9_-]/g, "")
  return suffix === "" ? null : `${prefix}${suffix}`
}

function parsePetCategory(value: unknown): PetCategory | null {
  return PET_CATEGORY_IDS.find((category) => category === value) ?? null
}

function parseNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function parseIsoDateTime(value: unknown): IsoDateTimeString | null {
  if (typeof value !== "string" || !isIsoDateTimeString(value)) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : value
}

function isIsoDateTimeString(value: string): value is IsoDateTimeString {
  return isoDateTimePattern.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isRecordDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}

function parseGrowthRecord(value: unknown): GrowthRecord | null {
  if (!isRecord(value)) return null
  const id = parseNonEmptyString(value["id"])
  const date = typeof value["date"] === "string" ? value["date"] : ""
  const note = typeof value["note"] === "string" ? value["note"] : ""
  const weightKg = value["weightKg"]
  if (
    id === null ||
    !isRecordDate(date) ||
    (weightKg !== undefined &&
      (typeof weightKg !== "number" ||
        !Number.isFinite(weightKg) ||
        weightKg <= 0 ||
        weightKg > 1000))
  )
    return null
  if (weightKg === undefined && note.trim() === "") return null
  return { id, date, note, ...(typeof weightKg === "number" ? { weightKg } : {}) }
}

function parseLocalComment(value: unknown): LocalComment | null {
  if (!isRecord(value)) return null
  const id = parseNonEmptyString(value["id"])
  const content = parseNonEmptyString(value["content"])
  const createdAt = parseIsoDateTime(value["createdAt"])
  return id === null || content === null || createdAt === null ? null : { id, content, createdAt }
}
