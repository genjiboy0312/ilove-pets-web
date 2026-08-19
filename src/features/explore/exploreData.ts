import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategory, PetCategoryFilter } from "../../constants/petCategories"
import { mockPetsById, mockPostIds, mockPostsById, mockUsersById } from "../../mocks/mockData"
import type { HttpsUrl, PetId, PostId } from "../../types/domain"

export interface ExplorePet {
  readonly petId: PetId
  readonly name: string
  readonly category: PetCategory
  readonly breed: string
  readonly avatarUrl: HttpsUrl
  readonly ownerUsername: string
}

export interface ExplorePost {
  readonly postId: PostId
  readonly petName: string
  readonly petAvatarUrl: HttpsUrl
  readonly imageUrl: HttpsUrl
  readonly likeCount: number
}

const explorePetIds = [
  "pet_bori",
  "pet_miso",
  "pet_nori",
  "pet_kiki",
  "pet_tofu",
  "pet_pebble",
] as const satisfies readonly PetId[]

export function getExplorePets(filter: PetCategoryFilter): readonly ExplorePet[] {
  const explorePets: ExplorePet[] = []

  for (const petId of explorePetIds) {
    const pet = mockPetsById[petId]

    if (filter === PET_FILTER_ALL || pet.category === filter) {
      const owner = mockUsersById[pet.ownerId]

      explorePets.push({
        petId: pet.id,
        name: pet.name,
        category: pet.category,
        breed: pet.breed,
        avatarUrl: pet.profileImageUrl,
        ownerUsername: owner.username,
      })
    }
  }

  return explorePets
}

export function getPopularPosts(): readonly ExplorePost[] {
  const popularPosts = mockPostIds.map((postId) => {
    const post = mockPostsById[postId]
    const pet = mockPetsById[post.petId]

    return {
      postId: post.id,
      petName: pet.name,
      petAvatarUrl: pet.profileImageUrl,
      imageUrl: post.imageUrl,
      likeCount: post.likedByUserIds.length,
    }
  })

  return [...popularPosts].sort((firstPost, secondPost) => {
    return secondPost.likeCount - firstPost.likeCount
  })
}
