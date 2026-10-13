import { ThumbImage } from "../../components/ThumbImage"
import type { PetId } from "../../types/domain"
import type { MyPet } from "./myData"

interface MyPetListProps {
  readonly onPetClick: (petId: PetId) => void
  readonly pets: readonly MyPet[]
}

export function MyPetList({ onPetClick, pets }: MyPetListProps) {
  return (
    <ul className="my-pet-list">
      {pets.map((pet) => (
        <li className="my-pet-card" key={pet.petId}>
          <button
            aria-label={pet.name}
            className="my-pet-card__button"
            onClick={() => {
              onPetClick(pet.petId)
            }}
            type="button"
          >
            <ThumbImage
              alt={pet.name}
              className="my-pet-card__avatar"
              height={48}
              src={pet.avatarUrl}
              width={48}
            />
            <div className="my-pet-card__identity">
              <h3 className="my-pet-card__name">{pet.name}</h3>
              <p className="my-pet-card__breed">{pet.breed}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
