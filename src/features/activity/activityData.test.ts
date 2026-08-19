import { describe, expect, it } from "vitest"

import { getActivities } from "./activityData"
import type { ActivityItem } from "./activityData"

describe("getActivities", () => {
  it("returns every mock activity sorted newest first", () => {
    // Given: mock activities with different timestamps.
    const activities = getActivities()

    // When: activity timestamps are read from the result.
    const createdAtValues = activities.map((activity) => activity.createdAt)

    // Then: the list is sorted from newest to oldest.
    expect(createdAtValues).toEqual([...createdAtValues].sort().reverse())
    expect(activities.map((activity) => activity.activityId)).toEqual([
      "activity_follow_current",
      "activity_comment_miso_sun",
      "activity_like_bori_hike",
    ])
  })

  it("projects a follow activity without post context", () => {
    // Given: the newest mock follow activity.
    const [followActivity] = getActivities()

    // When: the follow activity is inspected.
    const expectedFollowActivity = {
      activityId: "activity_follow_current",
      type: "FOLLOW",
      actorDisplayName: "Arden Lee",
      actorAvatarUrl: "https://images.example.com/users/arden.jpg",
      createdAt: "2026-08-18T13:25:00.000Z",
    } satisfies ActivityItem

    // Then: the actor and follow target fields are projected without post data.
    expect(followActivity).toEqual(expectedFollowActivity)
  })

  it("projects a comment activity with preview and pet context", () => {
    // Given: the mock comment activity.
    const commentActivity = getActivities().find(
      (activity) => activity.activityId === "activity_comment_miso_sun",
    )

    // When: the comment activity is inspected.
    const expectedCommentActivity = {
      activityId: "activity_comment_miso_sun",
      type: "COMMENT",
      actorDisplayName: "Solana Park",
      actorAvatarUrl: "https://images.example.com/users/solana.jpg",
      createdAt: "2026-08-18T12:10:00.000Z",
      petName: "Miso",
      postId: "post_miso_sun",
      commentPreview: "That color is perfect.",
    } satisfies ActivityItem

    // Then: the actor, pet, post, and preview fields are projected.
    expect(commentActivity).toEqual(expectedCommentActivity)
  })

  it("projects a like activity with pet context", () => {
    // Given: the mock like activity.
    const likeActivity = getActivities().find(
      (activity) => activity.activityId === "activity_like_bori_hike",
    )

    // When: the like activity is inspected.
    const expectedLikeActivity = {
      activityId: "activity_like_bori_hike",
      type: "LIKE",
      actorDisplayName: "Arden Lee",
      actorAvatarUrl: "https://images.example.com/users/arden.jpg",
      createdAt: "2026-08-18T10:00:00.000Z",
      petName: "Bori",
      postId: "post_bori_hike",
    } satisfies ActivityItem

    // Then: the actor and pet context fields are projected.
    expect(likeActivity).toEqual(expectedLikeActivity)
  })
})
