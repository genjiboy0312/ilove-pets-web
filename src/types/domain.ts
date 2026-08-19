import type { PetCategory } from "../constants/petCategories"

export type UserId = `user_${string}`

export type PetId = `pet_${string}`

export type PostId = `post_${string}`

export type ActivityId = `activity_${string}`
export type IsoDateTimeString = `${number}-${number}-${number}T${string}Z`
export type HttpsUrl = `https://${string}`

export interface User {
  readonly id: UserId
  readonly username: string
  readonly displayName: string
  readonly profileImageUrl: HttpsUrl
  readonly bio: string
  readonly followerCount: number
  readonly followingCount: number
}

export interface Pet {
  readonly id: PetId
  readonly ownerId: UserId
  readonly name: string
  readonly category: PetCategory
  readonly breed: string
  readonly profileImageUrl: HttpsUrl
  readonly bio: string
}

export interface Post {
  readonly id: PostId
  readonly petId: PetId
  readonly imageUrl: HttpsUrl
  readonly content: string
  readonly tags: readonly string[]
  readonly likedByUserIds: readonly UserId[]
  readonly commentCount: number
  readonly createdAt: IsoDateTimeString
}

interface ActivityBase {
  readonly id: ActivityId
  readonly actorId: UserId
  readonly createdAt: IsoDateTimeString
}

export type LikeActivity = ActivityBase & {
  readonly type: "LIKE"
  readonly postId: PostId
}

export type CommentActivity = ActivityBase & {
  readonly type: "COMMENT"
  readonly postId: PostId
  readonly commentPreview?: string
}

export type FollowActivity = ActivityBase & {
  readonly type: "FOLLOW"
  readonly targetUserId: UserId
}

export type Activity = LikeActivity | CommentActivity | FollowActivity

export type ActivityType = Activity["type"]
