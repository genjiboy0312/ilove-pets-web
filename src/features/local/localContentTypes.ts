import type { PetCategory } from "../../constants/petCategories"
import type { ImageSourceUrl, IsoDateTimeString, PetId, PostId } from "../../types/domain"

export const localContentChangedEvent = "ilove-pets-local-content-change"

export type LocalContentStatus = "idle" | "loading" | "ready" | "error"

export interface GrowthRecord {
  readonly id: string
  readonly date: string
  readonly weightKg?: number
  readonly note: string
}

export interface LocalComment {
  readonly id: string
  readonly content: string
  readonly createdAt: IsoDateTimeString
}

export interface LocalPet {
  readonly petId: PetId
  readonly name: string
  readonly category: PetCategory
  readonly breed: string
  readonly avatarUrl: ImageSourceUrl
  readonly photoKey?: string
  readonly growth?: readonly GrowthRecord[]
  readonly createdAt: IsoDateTimeString
}

export interface LocalPost {
  readonly postId: PostId
  readonly petId: PetId
  readonly imageUrl: ImageSourceUrl
  readonly liked?: boolean
  readonly comments?: readonly LocalComment[]
  readonly photoKey: string
  readonly content: string
  readonly tags: readonly string[]
  readonly createdAt: IsoDateTimeString
}

export interface LocalContent {
  readonly pets: readonly LocalPet[]
  readonly posts: readonly LocalPost[]
}

export interface LocalContentLoadResult {
  readonly content: LocalContent
  readonly warningMessage: string | null
}

export interface PetRegistrationInput {
  readonly name: string
  readonly category: PetCategory
  readonly breed: string
  readonly photo?: Blob
}

export interface PostPublishInput {
  readonly petId: PetId
  readonly image: Blob
  readonly content: string
  readonly tags: readonly string[]
}

export interface CreateDraft {
  readonly petId: PetId | ""
  readonly content: string
  readonly tags: string
}

export interface LocalContentSnapshot {
  readonly content: LocalContent
  readonly errorMessage: string | null
  readonly status: LocalContentStatus
}
