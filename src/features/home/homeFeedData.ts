import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategory, PetCategoryFilter } from "../../constants/petCategories"
import {
  CURRENT_USER_ID,
  mockPetsById,
  mockPostIds,
  mockPostsById,
  mockUsersById,
} from "../../mocks/mockData"
import type { ImageSourceUrl, IsoDateTimeString, Post, PostId } from "../../types/domain"
import type { LocalContent, LocalPost } from "../local/localContentTypes"
import { resolveOwnedPet } from "../local/ownedPetResolver"
import type { OwnedPetSummary } from "../local/ownedPetResolver"

export interface HomeFeedPost {
  readonly postId: PostId
  readonly petName: string
  readonly petAvatarUrl: ImageSourceUrl
  readonly ownerUsername: string
  readonly createdAt: IsoDateTimeString
  readonly imageUrl: ImageSourceUrl
  readonly content: string
  readonly tags: readonly string[]
  readonly likeCount: number
  readonly commentCount: number
  readonly petCategory: PetCategory
  readonly isLikedByMe: boolean
  readonly isLocalOnly: boolean
}

export function getHomeFeedPosts(
  filter: PetCategoryFilter,
  localContent: LocalContent = { pets: [], posts: [] },
): readonly HomeFeedPost[] {
  const sortedLocalPosts = [...localContent.posts].sort((firstPost, secondPost) =>
    secondPost.createdAt.localeCompare(firstPost.createdAt),
  )
  const homeFeedPosts: HomeFeedPost[] = sortedLocalPosts.flatMap((post) => {
    const pet = resolveOwnedPet(post.petId, localContent.pets)

    if (pet === null || !matchesFilter(pet.category, filter)) {
      return []
    }

    return [toLocalHomeFeedPost(post, pet)]
  })

  for (const postId of mockPostIds) {
    const post = mockPostsById[postId]
    const pet = mockPetsById[post.petId]

    if (matchesFilter(pet.category, filter)) {
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
        isLikedByMe: isLikedByCurrentUser(post),
        isLocalOnly: false,
      })
    }
  }

  return homeFeedPosts
}

function matchesFilter(category: PetCategory, filter: PetCategoryFilter): boolean {
  return filter === PET_FILTER_ALL || category === filter
}

function toLocalHomeFeedPost(post: LocalPost, pet: OwnedPetSummary): HomeFeedPost {
  return {
    postId: post.postId,
    petName: pet.name,
    petAvatarUrl: pet.avatarUrl,
    ownerUsername: "mira",
    createdAt: post.createdAt,
    imageUrl: post.imageUrl,
    content: post.content,
    tags: post.tags,
    likeCount: post.liked === true ? 1 : 0,
    commentCount: post.comments?.length ?? 0,
    petCategory: pet.category,
    isLikedByMe: post.liked ?? false,
    isLocalOnly: true,
  }
}

function isLikedByCurrentUser(post: Post): boolean {
  const likedByUserIds: readonly string[] = post.likedByUserIds

  return likedByUserIds.includes(CURRENT_USER_ID)
}
