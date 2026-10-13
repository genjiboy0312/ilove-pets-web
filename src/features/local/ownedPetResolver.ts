import { CURRENT_USER_ID, mockPetsById } from "../../mocks/mockData"
import type { ImageSourceUrl, IsoDateTimeString, PetId } from "../../types/domain"
import type { LocalPet } from "./localContentTypes"

export interface OwnedPetSummary {
  readonly avatarUrl: ImageSourceUrl
  readonly breed: string
  readonly category: LocalPet["category"]
  readonly createdAt?: IsoDateTimeString
  readonly name: string
  readonly petId: PetId
  readonly photoKey?: string
}

export function resolveOwnedPet(
  petId: PetId,
  localPets: readonly OwnedPetSummary[],
): OwnedPetSummary | null {
  const localPet = localPets.find((pet) => pet.petId === petId)

  if (localPet !== undefined) {
    return localPet
  }

  const seededPet = Object.values(mockPetsById).find((pet) => pet.id === petId)

  if (seededPet?.ownerId !== CURRENT_USER_ID) {
    return null
  }

  return {
    avatarUrl: seededPet.profileImageUrl,
    breed: seededPet.breed,
    category: seededPet.category,
    name: seededPet.name,
    petId: seededPet.id,
  }
}

export function isOwnedPet(petId: PetId, localPets: readonly OwnedPetSummary[]): boolean {
  return resolveOwnedPet(petId, localPets) !== null
}
