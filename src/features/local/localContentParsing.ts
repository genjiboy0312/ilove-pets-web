import type { PetId } from "../../types/domain"

export function parseSelectedPetId(value: string): PetId | null {
  if (!value.startsWith("pet_")) {
    return null
  }

  const suffix = value.slice("pet_".length).replace(/[^a-zA-Z0-9_-]/g, "")
  return suffix === "" ? null : `pet_${suffix}`
}

export function parseTags(value: string): readonly string[] {
  return [
    ...new Set(
      value
        .split(/[#,\s]+/)
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ""),
    ),
  ].slice(0, 5)
}
