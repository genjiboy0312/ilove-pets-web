import { describe, expect, it } from "vitest"

import { PET_FILTER_ALL } from "../../constants/petCategories"
import type { PetCategoryFilter } from "../../constants/petCategories"
import { getExplorePets, getPopularPosts } from "./exploreData"
import type { ExplorePet, ExplorePost } from "./exploreData"

const boriPet = {
  petId: "pet_bori",
  name: "Bori",
  category: "DOG",
  breed: "Jindo mix",
  avatarUrl: "https://images.example.com/pets/bori.jpg",
  ownerUsername: "mira",
} satisfies ExplorePet

describe("getExplorePets", () => {
  it("returns every pet in mock order when filter is ALL", () => {
    // Given: the ALL explore filter.
    const filter: PetCategoryFilter = PET_FILTER_ALL

    // When: explore pets are selected for display.
    const pets = getExplorePets(filter)

    // Then: every mock pet is returned in the normalized order.
    expect(pets.map((pet) => pet.petId)).toEqual([
      "pet_bori",
      "pet_miso",
      "pet_nori",
      "pet_kiki",
      "pet_tofu",
      "pet_pebble",
    ])
  })

  it("projects the first pet into ExplorePet display data", () => {
    // Given: the ALL explore filter.
    const filter: PetCategoryFilter = PET_FILTER_ALL

    // When: explore pets are selected for display.
    const [firstPet] = getExplorePets(filter)

    // Then: the first record includes pet and owner display fields.
    expect(firstPet).toEqual(boriPet)
  })

  it("returns only bird pets when filter is BIRD", () => {
    // Given: the BIRD explore filter.
    const filter: PetCategoryFilter = "BIRD"

    // When: explore pets are selected for display.
    const pets = getExplorePets(filter)

    // Then: only Kiki's bird pet is returned.
    expect(pets.map((pet) => pet.petId)).toEqual(["pet_kiki"])
  })
})

describe("getPopularPosts", () => {
  it("returns popular posts sorted by descending like count", () => {
    // Given: mock posts with different like counts.
    const posts = getPopularPosts()

    // When: like counts are read from the sorted result.
    const likeCounts = posts.map((post) => post.likeCount)

    // Then: the list is sorted from most liked to least liked.
    expect(likeCounts).toEqual([...likeCounts].sort((a, b) => b - a))
    expect(posts).toHaveLength(4)
  })

  it("projects the top post into ExplorePost display data", () => {
    // Given: mock posts where Bori's hike post has the most likes.
    const [topPost] = getPopularPosts()
    const expectedTopPost = {
      postId: "post_bori_hike",
      petName: "Bori",
      petAvatarUrl: "https://images.example.com/pets/bori.jpg",
      imageUrl: "https://images.example.com/posts/bori-hike.jpg",
      likeCount: 2,
    } satisfies ExplorePost

    // Then: the top post includes post, pet, and engagement fields.
    expect(topPost).toEqual(expectedTopPost)
  })
})
