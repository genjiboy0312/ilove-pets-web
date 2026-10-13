import { commitMetadata } from "./localContentCommit"
import { LocalContentMetadataError } from "./localContentErrors"
import {
  createDraftStorageKey,
  metadataStorageKey,
  toIsoDateTimeString,
} from "./localContentMetadata"
import type { StoredMetadata } from "./localContentMetadata"
import type { GrowthRecord, PetRegistrationInput } from "./localContentTypes"
import { emitLocalContentChanged } from "./localContentStore"
import { deletePhoto, clearPhotos } from "./photoStore"
import { withMetadataLock } from "./localContentCommit"
import { isGrowthInputValid } from "./growthDates"
import type { PetId, PostId } from "../../types/domain"

export class LinkedPetError extends Error {}

async function updateContent(update: (metadata: StoredMetadata) => StoredMetadata): Promise<void> {
  await commitMetadata(update)
  emitLocalContentChanged()
}

export async function updateLocalPet(
  petId: PetId,
  input: Omit<PetRegistrationInput, "photo">,
): Promise<void> {
  if (!input.name.trim() || !input.breed.trim())
    throw new LocalContentMetadataError("Required pet fields.")
  await updateContent((metadata) => {
    if (!metadata.pets.some((pet) => pet.id === petId))
      throw new LocalContentMetadataError("Pet no longer exists.")
    return {
      ...metadata,
      pets: metadata.pets.map((pet) =>
        pet.id === petId
          ? { ...pet, ...input, name: input.name.trim(), breed: input.breed.trim() }
          : pet,
      ),
    }
  })
}

export async function updateLocalPost(
  postId: PostId,
  content: string,
  tags: readonly string[],
): Promise<void> {
  if (!content.trim()) throw new LocalContentMetadataError("Required post content.")
  await updateContent((metadata) => {
    if (!metadata.posts.some((post) => post.id === postId))
      throw new LocalContentMetadataError("Post no longer exists.")
    return {
      ...metadata,
      posts: metadata.posts.map((post) =>
        post.id === postId ? { ...post, content: content.trim(), tags } : post,
      ),
    }
  })
}

export async function deleteLocalPost(postId: PostId): Promise<void> {
  let photoKey: string | undefined
  await updateContent((metadata) => {
    photoKey = metadata.posts.find((post) => post.id === postId)?.photoKey
    return { ...metadata, posts: metadata.posts.filter((post) => post.id !== postId) }
  })
  if (photoKey !== undefined) await deletePhoto(photoKey)
}

export async function deleteLocalPet(petId: PetId): Promise<void> {
  let photoKey: string | undefined
  await updateContent((metadata) => {
    if (metadata.posts.some((post) => post.petId === petId))
      throw new LinkedPetError("Delete linked posts first.")
    photoKey = metadata.pets.find((pet) => pet.id === petId)?.photoKey
    return { ...metadata, pets: metadata.pets.filter((pet) => pet.id !== petId) }
  })
  if (photoKey !== undefined) await deletePhoto(photoKey)
}

export async function setLocalPostLiked(postId: PostId, liked: boolean): Promise<void> {
  await updateContent((metadata) => {
    if (!metadata.posts.some((post) => post.id === postId))
      throw new LocalContentMetadataError("Post no longer exists.")
    return {
      ...metadata,
      posts: metadata.posts.map((post) => (post.id === postId ? { ...post, liked } : post)),
    }
  })
}

export async function addLocalComment(postId: PostId, content: string): Promise<void> {
  if (!content.trim()) return
  await updateContent((metadata) => {
    if (!metadata.posts.some((post) => post.id === postId))
      throw new LocalContentMetadataError("Post no longer exists.")
    return {
      ...metadata,
      posts: metadata.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...(post.comments ?? []),
                {
                  id: crypto.randomUUID(),
                  content: content.trim(),
                  createdAt: toIsoDateTimeString(new Date()),
                },
              ],
            }
          : post,
      ),
    }
  })
}

export async function addGrowthRecord(
  petId: PetId,
  input: Omit<GrowthRecord, "id">,
): Promise<void> {
  if (!isGrowthInputValid(input)) throw new LocalContentMetadataError("Invalid growth record.")
  await updateContent((metadata) => {
    if (!metadata.pets.some((pet) => pet.id === petId))
      throw new LocalContentMetadataError("Pet no longer exists.")
    return {
      ...metadata,
      pets: metadata.pets.map((pet) =>
        pet.id === petId
          ? {
              ...pet,
              growth: [
                ...(pet.growth ?? []),
                { ...input, note: input.note.trim(), id: crypto.randomUUID() },
              ].sort((a, b) => a.date.localeCompare(b.date)),
            }
          : pet,
      ),
    }
  })
}

export async function updateGrowthRecord(
  petId: PetId,
  recordId: string,
  input: Omit<GrowthRecord, "id">,
): Promise<void> {
  if (!isGrowthInputValid(input)) throw new LocalContentMetadataError("Invalid growth record.")
  await updateContent((metadata) => {
    const target = metadata.pets.find((pet) => pet.id === petId)
    if (!target?.growth?.some((record) => record.id === recordId))
      throw new LocalContentMetadataError("Record no longer exists.")
    return {
      ...metadata,
      pets: metadata.pets.map((pet) =>
        pet.id !== petId
          ? pet
          : {
              ...pet,
              growth: (pet.growth ?? [])
                .map((record) =>
                  record.id === recordId
                    ? { ...input, id: recordId, note: input.note.trim() }
                    : record,
                )
                .sort((a, b) => a.date.localeCompare(b.date)),
            },
      ),
    }
  })
}

export async function deleteGrowthRecord(petId: PetId, recordId: string): Promise<void> {
  await updateContent((metadata) => ({
    ...metadata,
    pets: metadata.pets.map((pet) =>
      pet.id === petId
        ? { ...pet, growth: (pet.growth ?? []).filter((record) => record.id !== recordId) }
        : pet,
    ),
  }))
}

export async function resetLocalContent(): Promise<void> {
  try {
    await withMetadataLock(async () => {
      // Metadata removal must succeed before photos are cleared. Reset also recovers corrupt JSON.
      localStorage.removeItem(metadataStorageKey)
      localStorage.removeItem(createDraftStorageKey)
      await clearPhotos()
    })
  } finally {
    emitLocalContentChanged()
  }
}
