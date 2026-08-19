import {
  mockActivitiesById,
  mockActivityIds,
  mockPetsById,
  mockPostsById,
  mockUsersById,
} from "../../mocks/mockData"
import type {
  ActivityId,
  ActivityType,
  HttpsUrl,
  IsoDateTimeString,
  PostId,
} from "../../types/domain"

export interface ActivityItem {
  readonly activityId: ActivityId
  readonly type: ActivityType
  readonly actorDisplayName: string
  readonly actorAvatarUrl: HttpsUrl
  readonly createdAt: IsoDateTimeString
  readonly petName?: string
  readonly postId?: PostId
  readonly commentPreview?: string
}

export function getActivities(): readonly ActivityItem[] {
  const activities = mockActivityIds.map((activityId) => {
    const activity = mockActivitiesById[activityId]
    const actor = mockUsersById[activity.actorId]

    if (activity.type === "FOLLOW") {
      return {
        activityId: activity.id,
        type: activity.type,
        actorDisplayName: actor.displayName,
        actorAvatarUrl: actor.profileImageUrl,
        createdAt: activity.createdAt,
      }
    }

    const post = mockPostsById[activity.postId]
    const pet = mockPetsById[post.petId]

    return {
      activityId: activity.id,
      type: activity.type,
      actorDisplayName: actor.displayName,
      actorAvatarUrl: actor.profileImageUrl,
      createdAt: activity.createdAt,
      petName: pet.name,
      postId: post.id,
      ...(activity.type === "COMMENT" ? { commentPreview: activity.commentPreview } : {}),
    }
  })

  return [...activities].sort((firstActivity, secondActivity) => {
    return secondActivity.createdAt.localeCompare(firstActivity.createdAt)
  })
}
