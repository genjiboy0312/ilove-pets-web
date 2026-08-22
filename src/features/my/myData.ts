import {
  CURRENT_USER_ID,
  mockPetIds,
  mockPetsById,
  mockPostIds,
  mockPostsById,
  mockUsersById,
} from "../../mocks/mockData"
import type { HttpsUrl, IsoDateTimeString, PetId, PostId, UserId } from "../../types/domain"

export interface MyConnection {
  readonly userId: UserId
  readonly displayName: string
  readonly username: string
  readonly avatarUrl: HttpsUrl
}

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

const connectionUserIds = ["user_arden", "user_solana"] as const satisfies readonly UserId[]

function getConnections(): readonly MyConnection[] {
  return connectionUserIds.flatMap((userId) => {
    const user = mockUsersById[userId]

    return [
      {
        userId: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.profileImageUrl,
      },
    ]
  })
}

export function getFollowers(): readonly MyConnection[] {
  return getConnections()
}

export function getFollowing(): readonly MyConnection[] {
  return getConnections()
}

export interface PetGrowthPoint {
  readonly month: string
  readonly weightKg: number
}

export interface PetCareEvent {
  readonly eventId: string
  readonly date: IsoDateTimeString
  readonly label: string
  readonly kind: "vaccine" | "checkup" | "grooming"
}

export interface PetGrowth {
  readonly petId: PetId
  readonly weights: readonly PetGrowthPoint[]
  readonly events: readonly PetCareEvent[]
}

const growthByPetId: Record<string, PetGrowth> = {
  pet_bori: {
    petId: "pet_bori",
    weights: [
      { month: "2026-03", weightKg: 9.2 },
      { month: "2026-04", weightKg: 9.8 },
      { month: "2026-05", weightKg: 10.4 },
      { month: "2026-06", weightKg: 11.1 },
      { month: "2026-07", weightKg: 11.6 },
      { month: "2026-08", weightKg: 12.0 },
    ],
    events: [
      {
        eventId: "care_bori_1",
        date: "2026-06-14T10:00:00.000Z",
        label: "Rabies vaccine (annual)",
        kind: "vaccine",
      },
      {
        eventId: "care_bori_2",
        date: "2026-07-02T16:30:00.000Z",
        label: "Bath & brushing",
        kind: "grooming",
      },
      {
        eventId: "care_bori_3",
        date: "2026-08-08T11:00:00.000Z",
        label: "Regular checkup — all clear",
        kind: "checkup",
      },
    ],
  },
  pet_miso: {
    petId: "pet_miso",
    weights: [
      { month: "2026-03", weightKg: 0.42 },
      { month: "2026-04", weightKg: 0.45 },
      { month: "2026-05", weightKg: 0.47 },
      { month: "2026-06", weightKg: 0.46 },
      { month: "2026-07", weightKg: 0.48 },
      { month: "2026-08", weightKg: 0.5 },
    ],
    events: [
      {
        eventId: "care_miso_1",
        date: "2026-05-20T09:00:00.000Z",
        label: "Shedding check",
        kind: "checkup",
      },
      {
        eventId: "care_miso_2",
        date: "2026-08-01T14:00:00.000Z",
        label: "Nail trim",
        kind: "grooming",
      },
    ],
  },
}

export function getPetGrowth(petId: PetId): PetGrowth {
  const growth = growthByPetId[petId]

  if (growth !== undefined) {
    return growth
  }

  return {
    petId,
    weights: [
      { month: "2026-06", weightKg: 1 },
      { month: "2026-07", weightKg: 1.1 },
      { month: "2026-08", weightKg: 1.2 },
    ],
    events: [],
  }
}
