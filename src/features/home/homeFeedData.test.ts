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
  isLocalOnly: false,
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

  it("prepends local posts newest-first under the same category filters", () => {
    // Given: local pet and post records stored by the browser-only milestone.
    const localContent = {
      pets: [
        {
          petId: "pet_local_mochi",
          name: "Mochi",
          category: "CAT",
          breed: "Korean shorthair",
          avatarUrl: "data:image/svg+xml,%3Csvg/%3E",
          createdAt: "2026-10-10T10:00:00.000Z",
        },
      ],
      posts: [
        {
          postId: "post_local_mochi_1",
          petId: "pet_local_mochi",
          imageUrl: "blob:http://127.0.0.1/local-photo",
          photoKey: "post-post_local_mochi_1",
          content: "Mochi joined the local demo feed.",
          tags: ["cat", "local"],
          createdAt: "2026-10-10T10:05:00.000Z",
        },
      ],
    } as const

    // When: the CAT feed is selected.
    const posts = getHomeFeedPosts("CAT", localContent)

    // Then: the local post appears as local-only display data instead of requiring mock IDs.
    expect(posts).toEqual([
      {
        postId: "post_local_mochi_1",
        petName: "Mochi",
        petAvatarUrl: "data:image/svg+xml,%3Csvg/%3E",
        ownerUsername: "mira",
        createdAt: "2026-10-10T10:05:00.000Z",
        imageUrl: "blob:http://127.0.0.1/local-photo",
        content: "Mochi joined the local demo feed.",
        tags: ["cat", "local"],
        likeCount: 0,
        commentCount: 0,
        petCategory: "CAT",
        isLikedByMe: false,
        isLocalOnly: true,
      },
    ])
  })

  it("keeps local post order lexical by padded ISO timestamps", () => {
    // Given: two local posts whose chronological order depends on padded date parts.
    const localContent = {
      pets: [
        {
          petId: "pet_local_mochi",
          name: "Mochi",
          category: "CAT",
          breed: "Korean shorthair",
          avatarUrl: "data:image/svg+xml,%3Csvg/%3E",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      posts: [
        {
          postId: "post_local_old",
          petId: "pet_local_mochi",
          imageUrl: "blob:http://127.0.0.1/old",
          photoKey: "post-post_local_old",
          content: "Old post",
          tags: [],
          createdAt: "2026-01-09T00:00:00.000Z",
        },
        {
          postId: "post_local_new",
          petId: "pet_local_mochi",
          imageUrl: "blob:http://127.0.0.1/new",
          photoKey: "post-post_local_new",
          content: "New post",
          tags: [],
          createdAt: "2026-01-10T00:00:00.000Z",
        },
      ],
    } as const

    // When: the CAT feed is selected.
    const posts = getHomeFeedPosts("CAT", localContent)

    // Then: lexical sorting keeps the newer padded date first.
    expect(posts.map((post) => post.postId)).toEqual(["post_local_new", "post_local_old"])
  })

  it("shows local posts published for seeded owned pets in matching home filters", () => {
    const localContent = {
      pets: [],
      posts: [
        {
          postId: "post_local_bori_seeded",
          petId: "pet_bori",
          imageUrl: "blob:http://127.0.0.1/seeded",
          photoKey: "post-post_local_bori_seeded",
          content: "Bori uses the seeded pet selector.",
          tags: ["dog", "local"],
          createdAt: "2026-10-10T12:00:00.000Z",
        },
      ],
    } as const

    const dogPosts = getHomeFeedPosts("DOG", localContent)
    const catPosts = getHomeFeedPosts("CAT", localContent)

    expect(dogPosts[0]).toMatchObject({
      postId: "post_local_bori_seeded",
      petName: "Bori",
      petCategory: "DOG",
      isLocalOnly: true,
    })
    expect(catPosts).toEqual([])
  })
})
