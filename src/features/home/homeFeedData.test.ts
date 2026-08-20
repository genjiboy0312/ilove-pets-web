import { describe, expect, it } from "vitest"

import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategoryFilter } from "../../constants/petCategories"
import { mockPostIds } from "../../mocks/mockData"
import { getHomeFeedPosts } from "./homeFeedData"
import type { HomeFeedPost } from "./homeFeedData"

const boriPost = {
  postId: "post_bori_hike",
  petName: "Bori",
  petAvatarUrl: "https://images.example.com/pets/bori.jpg",
  ownerUsername: "mira",
  createdAt: "2026-08-18T09:15:00.000Z",
  imageUrl: "https://images.example.com/posts/bori-hike.jpg",
  content: "New ridge route approved by Bori.",
  tags: ["hike", "dog", "weekend"],
  likeCount: 2,
  commentCount: 3,
  petCategory: "DOG",
  isLikedByMe: false,
} satisfies HomeFeedPost

describe("getHomeFeedPosts", () => {
  it("returns every normalized post in mockPostIds order when filter is ALL", () => {
    // Given: the ALL home feed filter and normalized mock post order.
    const filter: PetCategoryFilter = PET_FILTER_ALL

    // When: home feed posts are selected for display.
    const posts = getHomeFeedPosts(filter)
    const postIds = posts.map((post) => post.postId)

    // Then: every mock post is returned in the normalized order.
    expect(posts).toHaveLength(4)
    expect(postIds).toEqual([...mockPostIds])
  })

  it("projects the first normalized post into HomeFeedPost display data", () => {
    // Given: the ALL home feed filter.
    const filter: PetCategoryFilter = PET_FILTER_ALL

    // When: home feed posts are selected for display.
    const posts = getHomeFeedPosts(filter)
    const [firstPost] = posts

    // Then: the first record includes post, pet, owner, and engagement fields.
    expect(firstPost).toEqual(boriPost)
  })

  it("returns only Bori's post when filter is DOG", () => {
    // Given: the DOG home feed filter.
    const filter: PetCategoryFilter = "DOG"

    // When: home feed posts are selected for display.
    const posts = getHomeFeedPosts(filter)

    // Then: only Bori's normalized dog post is returned.
    expect(posts).toEqual([boriPost])
  })

  it("returns no posts when filter is CAT", () => {
    // Given: the CAT home feed filter with no normalized cat posts.
    const filter: PetCategoryFilter = "CAT"

    // When: home feed posts are selected for display.
    const posts = getHomeFeedPosts(filter)

    // Then: the result is empty.
    expect(posts).toEqual([])
  })
})
