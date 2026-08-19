import { describe, expect, it } from "vitest"

import { PET_CATEGORY_IDS } from "../constants/petCategories"
import {
  CURRENT_USER_ID,
  mockActivitiesById,
  mockActivityIds,
  mockPetsById,
  mockPostIds,
  mockPostsById,
  mockUsersById,
} from "./mockData"
import type { Activity, ActivityType } from "../types/domain"

function getActivityReferenceKind(activity: Activity): "post" | "user" {
  switch (activity.type) {
    case "LIKE":
      return "post"
    case "COMMENT":
      return "post"
    case "FOLLOW":
      return "user"
    default: {
      const exhaustiveActivity: never = activity

      return exhaustiveActivity
    }
  }
}

describe("normalized mock data invariants", () => {
  it("keeps normalized ID order arrays pointed at existing records", () => {
    // Given: normalized post and activity records with ordered ID projections.
    const postIds = Object.keys(mockPostsById)
    const activityIds = Object.keys(mockActivitiesById)

    // When: order arrays are compared with their backing record keys.
    const orderedPostIds = [...mockPostIds]
    const orderedActivityIds = [...mockActivityIds]

    // Then: each order array references every existing record exactly once.
    expect(orderedPostIds).toHaveLength(postIds.length)
    expect(orderedActivityIds).toHaveLength(activityIds.length)
    expect(new Set(orderedPostIds).size).toBe(orderedPostIds.length)
    expect(new Set(orderedActivityIds).size).toBe(orderedActivityIds.length)
    for (const postId of orderedPostIds) {
      expect(mockPostsById).toHaveProperty(postId)
    }
    for (const activityId of orderedActivityIds) {
      expect(mockActivitiesById).toHaveProperty(activityId)
    }
  })

  it("connects every pet to a user and covers every pet category", () => {
    // Given: normalized users and pets.
    const pets = Object.values(mockPetsById)

    // When: owner and category relationships are derived from pet records.
    const categories = new Set(pets.map((pet) => pet.category))
    const currentUserPetCount = pets.filter((pet) => pet.ownerId === CURRENT_USER_ID).length

    // Then: every pet owner exists and all product categories are represented.
    expect(Object.keys(mockUsersById).length).toBeGreaterThanOrEqual(3)
    expect(currentUserPetCount).toBeGreaterThanOrEqual(2)
    expect([...categories]).toEqual(expect.arrayContaining([...PET_CATEGORY_IDS]))
    for (const pet of pets) {
      expect(mockUsersById).toHaveProperty(pet.ownerId)
    }
  })

  it("derives post authors only through pet ownership", () => {
    // Given: normalized posts, pets, and users.
    const posts = Object.values(mockPostsById)

    // When: each post author is resolved from post.petId to pet.ownerId.
    const postAuthorIds = posts.map((post) => mockPetsById[post.petId].ownerId)

    // Then: every post resolves through an existing pet owner without author duplication.
    expect(posts).toHaveLength(4)
    for (const post of posts) {
      expect(post).not.toHaveProperty("authorId")
      expect(mockPetsById).toHaveProperty(post.petId)
    }
    for (const authorId of postAuthorIds) {
      expect(authorId).not.toBeUndefined()
      expect(mockUsersById).toHaveProperty(authorId)
    }
  })

  it("keeps activity actors and targets connected to normalized records", () => {
    // Given: normalized activities with typed variants.
    const activities = Object.values(mockActivitiesById)

    // When: each activity target kind is selected through an exhaustive switch.
    const activityReferenceKinds = activities.map(getActivityReferenceKind)

    // Then: actors exist and variant targets point only to valid records.
    expect(activityReferenceKinds).toEqual(expect.arrayContaining(["post", "user"]))
    for (const activity of activities) {
      expect(mockUsersById).toHaveProperty(activity.actorId)
      switch (activity.type) {
        case "LIKE":
          expect(mockPostsById).toHaveProperty(activity.postId)
          break
        case "COMMENT":
          expect(mockPostsById).toHaveProperty(activity.postId)
          break
        case "FOLLOW":
          expect(mockUsersById).toHaveProperty(activity.targetUserId)
          break
        default: {
          const exhaustiveActivity: never = activity

          expect(exhaustiveActivity).toBeUndefined()
        }
      }
    }
  })

  it("covers all activity variants", () => {
    // Given: normalized activities.
    const activities = Object.values(mockActivitiesById)

    // When: activity types are collected from fixture records.
    const activityTypes = new Set<ActivityType>(activities.map((activity) => activity.type))

    // Then: LIKE, COMMENT, and FOLLOW are present.
    expect(activityTypes).toEqual(new Set<ActivityType>(["LIKE", "COMMENT", "FOLLOW"]))
  })

  it("uses ISO Z timestamps and HTTPS image URLs", () => {
    // Given: normalized records with timestamp and image URL fields.
    const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    const imageUrls = [
      ...Object.values(mockUsersById).map((user) => user.profileImageUrl),
      ...Object.values(mockPetsById).map((pet) => pet.profileImageUrl),
      ...Object.values(mockPostsById).map((post) => post.imageUrl),
    ]
    const createdAtValues = [
      ...Object.values(mockPostsById).map((post) => post.createdAt),
      ...Object.values(mockActivitiesById).map((activity) => activity.createdAt),
    ]

    // When: fixture boundary-shaped scalar values are inspected.
    const allImagesUseHttps = imageUrls.every((imageUrl) => imageUrl.startsWith("https://"))
    const allTimesUseIsoZulu = createdAtValues.every((createdAt) =>
      isoDateTimePattern.test(createdAt),
    )

    // Then: every image URL and timestamp matches the typed data contract.
    expect(allImagesUseHttps).toBe(true)
    expect(allTimesUseIsoZulu).toBe(true)
  })
})
