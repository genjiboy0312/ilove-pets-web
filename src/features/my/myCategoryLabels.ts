import type { PetCategory } from "../../constants/petCategories"

export function categoryToLabelKey(
  category: PetCategory,
): "dog" | "cat" | "reptile" | "bird" | "smallAnimal" | "etc" {
  switch (category) {
    case "DOG":
      return "dog"
    case "CAT":
      return "cat"
    case "REPTILE":
      return "reptile"
    case "BIRD":
      return "bird"
    case "SMALL_ANIMAL":
      return "smallAnimal"
    case "ETC":
      return "etc"
  }
}
