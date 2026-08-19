import {
  CURRENT_USER_ID,
  mockPetIds,
  mockPetsById,
  mockPostIds,
  mockPostsById,
  mockUsersById,
} from "../../mocks/mockData"
import type { HttpsUrl, IsoDateTimeString, PetId, PostId } from "../../types/domain"

export interface MyPet {
  readonly petId: PetId
  readonly name: string
  readonly breed: string
  readonly avatarUrl: HttpsUrl
}

export interface MyPost {
  readonly postId: PostId
  readonly petName: string
  readonly imageUrl: HttpsUrl
  readonly createdAt: IsoDateTimeString
}

export interface MyProfile {
  readonly username: string
  readonly displayName: string
  readonly bio: string
  readonly avatarUrl: HttpsUrl
  readonly followerCount: number
  readonly followingCount: number
  readonly pets: readonly MyPet[]
  readonly posts: readonly MyPost[]
}

export function getMyProfile(): MyProfile {
  const user = mockUsersById[CURRENT_USER_ID]

  const pets = mockPetIds.flatMap((petId) => {
    const pet = mockPetsById[petId]

    return pet.ownerId === CURRENT_USER_ID
      ? [
          {
            petId: pet.id,
            name: pet.name,
            breed: pet.breed,
            avatarUrl: pet.profileImageUrl,
          },
        ]
      : []
  })

  const posts = mockPostIds.flatMap((postId) => {
    const post = mockPostsById[postId]
    const pet = mockPetsById[post.petId]

    return pet.ownerId === CURRENT_USER_ID
      ? [
          {
            postId: post.id,
            petName: pet.name,
            imageUrl: post.imageUrl,
            createdAt: post.createdAt,
          },
        ]
      : []
  })

  return {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.profileImageUrl,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    pets,
    posts,
  }
}
