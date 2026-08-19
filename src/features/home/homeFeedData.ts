import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategory, PetCategoryFilter } from "../../constants/petCategories"
import { mockPetsById, mockPostIds, mockPostsById, mockUsersById } from "../../mocks/mockData"
import type { HttpsUrl, IsoDateTimeString, PostId } from "../../types/domain"

export interface HomeFeedPost {
  readonly postId: PostId
  readonly petName: string
  readonly petAvatarUrl: HttpsUrl
  readonly ownerUsername: string
  readonly createdAt: IsoDateTimeString
  readonly imageUrl: HttpsUrl
  readonly content: string
  readonly tags: readonly string[]
  readonly likeCount: number
  readonly commentCount: number
  readonly petCategory: PetCategory
}

export function getHomeFeedPosts(filter: PetCategoryFilter): readonly HomeFeedPost[] {
  const homeFeedPosts: HomeFeedPost[] = []

  for (const postId of mockPostIds) {
    const post = mockPostsById[postId]
    const pet = mockPetsById[post.petId]

    if (filter === PET_FILTER_ALL || pet.category === filter) {
      const owner = mockUsersById[pet.ownerId]

      homeFeedPosts.push({
        postId: post.id,
        petName: pet.name,
        petAvatarUrl: pet.profileImageUrl,
        ownerUsername: owner.username,
        createdAt: post.createdAt,
        imageUrl: post.imageUrl,
        content: post.content,
        tags: post.tags,
        likeCount: post.likedByUserIds.length,
        commentCount: post.commentCount,
        petCategory: pet.category,
      })
    }
  }

  return homeFeedPosts
}
