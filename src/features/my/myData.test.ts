import { describe, expect, it } from "vitest"

import { getMyProfile } from "./myData"
import type { MyPet, MyPost } from "./myData"

describe("getMyProfile", () => {
  it("projects the current user profile with engagement counts", () => {
    // Given: the current mock user owns pets and posts.
    const profile = getMyProfile()

    // When: the profile is inspected.
    // Then: identity and engagement fields are projected from the normalized record.
    expect(profile.username).toBe("mira")
    expect(profile.displayName).toBe("Mira Han")
    expect(profile.bio).toBe("Weekend foster and reptile keeper.")
    expect(profile.avatarUrl).toBe("https://images.example.com/users/mira.jpg")
    expect(profile.followerCount).toBe(128)
    expect(profile.followingCount).toBe(46)
  })

  it("lists only pets owned by the current user", () => {
    // Given: the current mock user owns Bori and Miso.
    const { pets } = getMyProfile()
    const expectedPets = [
      {
        petId: "pet_bori",
        name: "Bori",
        breed: "Jindo mix",
        avatarUrl: "https://images.example.com/pets/bori.jpg",
      },
      {
        petId: "pet_miso",
        name: "Miso",
        breed: "Leopard gecko",
        avatarUrl: "https://images.example.com/pets/miso.jpg",
      },
    ] as const satisfies readonly MyPet[]

    // Then: only the current user's pets are returned.
    expect(pets).toEqual(expectedPets)
  })

  it("lists only posts owned by the current user's pets", () => {
    // Given: the current mock user's pets have two posts.
    const { posts } = getMyProfile()
    const expectedPosts = [
      {
        postId: "post_bori_hike",
        petName: "Bori",
        imageUrl: "https://images.example.com/posts/bori-hike.jpg",
        createdAt: "2026-08-18T09:15:00.000Z",
      },
      {
        postId: "post_miso_sun",
        petName: "Miso",
        imageUrl: "https://images.example.com/posts/miso-sun.jpg",
        createdAt: "2026-08-18T11:30:00.000Z",
      },
    ] as const satisfies readonly MyPost[]

    // Then: only posts from the current user's pets are returned.
    expect(posts).toEqual(expectedPosts)
  })
})
