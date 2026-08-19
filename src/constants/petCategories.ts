export const PET_CATEGORY_IDS = ["DOG", "CAT", "REPTILE", "BIRD", "SMALL_ANIMAL", "ETC"] as const

export const PET_FILTER_ALL = "ALL"

export const PET_FILTER_IDS = [PET_FILTER_ALL, ...PET_CATEGORY_IDS] as const

export type PetCategory = (typeof PET_CATEGORY_IDS)[number]

export type PetCategoryFilter = (typeof PET_FILTER_IDS)[number]
