import type { ImageSourceUrl, PetId, PostId } from "../../types/domain"
import type {
  LocalContentLoadResult,
  LocalPet,
  LocalPost,
  PetRegistrationInput,
  PostPublishInput,
} from "./localContentTypes"
import { localContentChangedEvent } from "./localContentTypes"
import { LocalContentMetadataError, LocalContentStorageError } from "./localContentErrors"
import { commitMetadata, withMetadataLock } from "./localContentCommit"
import { deletePhoto, getPhotos, putPhoto, prunePhotos } from "./photoStore"
import {
  readCreateDraft,
  readMetadata,
  toIsoDateTimeString,
  writeCreateDraft,
  clearCreateDraft,
  canPrunePhotos,
} from "./localContentMetadata"
import type { StoredPet, StoredPost } from "./localContentMetadata"
import { isOwnedPet } from "./ownedPetResolver"

export { clearCreateDraft, readCreateDraft, writeCreateDraft }
export { LocalContentMetadataError, LocalContentStorageError }

const placeholderAvatarUrl: ImageSourceUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23e5ece3'/%3E%3Cpath d='M26 54c4 14 16 22 30 18 13-4 19-18 14-30-5-13-20-20-34-15C25 31 21 42 26 54Z' fill='%235f7561'/%3E%3Ccircle cx='40' cy='45' r='4' fill='%23faf9f6'/%3E%3Ccircle cx='59' cy='43' r='4' fill='%23faf9f6'/%3E%3Cpath d='M46 57c5 3 10 2 15-2' fill='none' stroke='%23faf9f6' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E"

export async function loadLocalContent(): Promise<LocalContentLoadResult> {
  const { metadata, photos } = await withMetadataLock(async () => {
    const saved = readMetadata()
    const keys = new Set([
      ...saved.pets.flatMap((pet) => (pet.photoKey === undefined ? [] : [pet.photoKey])),
      ...saved.posts.map((post) => post.photoKey),
    ])
    // Only prune under a real cross-tab lock, after metadata was parsed successfully.
    // This retries orphan cleanup from failed deletion or interrupted restore staging.
    if ("locks" in navigator && canPrunePhotos(saved)) {
      try {
        await prunePhotos(keys)
      } catch {
        /* Retry on the next refresh without blocking readable content. */
      }
    }
    // Capture all referenced photos in one transaction while replacement writes are excluded.
    return { metadata: saved, photos: await getPhotos(keys) }
  })
  const pets = metadata.pets.map((pet) => toLocalPet(pet, photos))
  const loadedPosts = metadata.posts.map((post) => toLocalPostResult(post, photos))
  const posts = loadedPosts.flatMap((result) => (result.post === null ? [] : [result.post]))
  const missingPhotoCount = loadedPosts.filter((result) => result.post === null).length

  return {
    content: { pets, posts: posts.sort(newestFirst) },
    warningMessage:
      missingPhotoCount === 0
        ? null
        : `${String(missingPhotoCount)} saved post photo could not be loaded. Recreate the missing post or clear site data.`,
  }
}

export async function registerLocalPet(input: PetRegistrationInput): Promise<PetId> {
  const petId: PetId = `pet_local_${crypto.randomUUID()}`
  const photoKey = input.photo === undefined ? undefined : `pet-${petId}`

  const storedPet = createStoredPet(input, petId, photoKey)

  try {
    await commitMetadata(async (metadata) => {
      if (photoKey !== undefined && input.photo !== undefined) await putPhoto(photoKey, input.photo)
      return { ...metadata, pets: [storedPet, ...metadata.pets] }
    })
  } catch (error) {
    if (photoKey !== undefined) {
      await deletePhoto(photoKey)
    }
    throw error
  }

  emitLocalContentChanged()
  return petId
}

export async function publishLocalPost(input: PostPublishInput): Promise<PostId> {
  const postId: PostId = `post_local_${crypto.randomUUID()}`
  const photoKey = `post-${postId}`

  try {
    await commitMetadata(async (metadata) => {
      const localPetSummaries = metadata.pets.map((pet) => ({
        avatarUrl: placeholderAvatarUrl,
        breed: pet.breed,
        category: pet.category,
        createdAt: pet.createdAt,
        ...(pet.growth === undefined ? {} : { growth: pet.growth }),
        name: pet.name,
        petId: pet.id,
        ...(pet.photoKey === undefined ? {} : { photoKey: pet.photoKey }),
      }))

      if (!isOwnedPet(input.petId, localPetSummaries)) {
        throw new LocalContentMetadataError("Choose one of your registered pets before publishing.")
      }

      await putPhoto(photoKey, input.image)
      const storedPost: StoredPost = {
        id: postId,
        petId: input.petId,
        photoKey,
        content: input.content,
        tags: input.tags,
        createdAt: toIsoDateTimeString(new Date()),
      }

      return { pets: metadata.pets, posts: [storedPost, ...metadata.posts] }
    })
  } catch (error) {
    await deletePhoto(photoKey)
    throw error
  }

  emitLocalContentChanged()
  return postId
}

export function emitLocalContentChanged(): void {
  window.dispatchEvent(new Event(localContentChangedEvent))
}

function createStoredPet(
  input: PetRegistrationInput,
  petId: PetId,
  photoKey: string | undefined,
): StoredPet {
  const basePet = {
    id: petId,
    name: input.name,
    category: input.category,
    breed: input.breed,
    createdAt: toIsoDateTimeString(new Date()),
  }

  return photoKey === undefined ? basePet : { ...basePet, photoKey }
}

function toLocalPet(pet: StoredPet, photos: ReadonlyMap<string, Blob>): LocalPet {
  const basePet = {
    petId: pet.id,
    name: pet.name,
    category: pet.category,
    breed: pet.breed,
    avatarUrl: getOptionalImageUrl(pet.photoKey, photos),
    createdAt: pet.createdAt,
    ...(pet.growth === undefined ? {} : { growth: pet.growth }),
  }

  return pet.photoKey === undefined ? basePet : { ...basePet, photoKey: pet.photoKey }
}

interface LocalPostResult {
  readonly post: LocalPost | null
}

function toLocalPostResult(post: StoredPost, photos: ReadonlyMap<string, Blob>): LocalPostResult {
  try {
    return { post: toLocalPost(post, photos) }
  } catch (error) {
    if (error instanceof LocalContentStorageError) {
      return { post: null }
    }

    throw error
  }
}

function toLocalPost(post: StoredPost, photos: ReadonlyMap<string, Blob>): LocalPost {
  return {
    postId: post.id,
    ...(post.liked === undefined ? {} : { liked: post.liked }),
    ...(post.comments === undefined ? {} : { comments: post.comments }),
    petId: post.petId,
    imageUrl: getRequiredImageUrl(post.photoKey, photos),
    photoKey: post.photoKey,
    content: post.content,
    tags: post.tags,
    createdAt: post.createdAt,
  }
}

function getOptionalImageUrl(
  photoKey: string | undefined,
  photos: ReadonlyMap<string, Blob>,
): ImageSourceUrl {
  if (photoKey === undefined) {
    return placeholderAvatarUrl
  }

  const blob = photos.get(photoKey)
  return blob === undefined ? placeholderAvatarUrl : toBlobUrl(blob)
}

function getRequiredImageUrl(photoKey: string, photos: ReadonlyMap<string, Blob>): ImageSourceUrl {
  const blob = photos.get(photoKey)

  if (blob === undefined) {
    throw new LocalContentStorageError(
      "A saved post photo is missing. Recreate the post or clear site data.",
    )
  }

  return toBlobUrl(blob)
}

function toBlobUrl(blob: Blob): ImageSourceUrl {
  const objectUrl = URL.createObjectURL(blob)
  const suffix = objectUrl.startsWith("blob:") ? objectUrl.slice("blob:".length) : ""
  return `blob:${suffix}`
}

function newestFirst(firstPost: LocalPost, secondPost: LocalPost): number {
  return secondPost.createdAt.localeCompare(firstPost.createdAt)
}
