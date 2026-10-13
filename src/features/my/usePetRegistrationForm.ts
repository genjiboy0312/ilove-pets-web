import { useRef, useState } from "react"
import type { SyntheticEvent } from "react"
import type { TFunction } from "i18next"

import type { PetCategory } from "../../constants/petCategories"
import { validateImageFile } from "../local/imageValidation"
import { registerLocalPet } from "../local/localContentStore"

export type PetRegistrationStatus = "idle" | "saving" | "saved" | "error"

export interface PetRegistrationFormState {
  readonly breed: string
  readonly category: PetCategory
  readonly error: string | null
  readonly isSubmitDisabled: boolean
  readonly name: string
  readonly status: PetRegistrationStatus
  readonly handleBreedChange: (value: string) => void
  readonly handleCategoryChange: (category: PetCategory) => void
  readonly handleNameChange: (value: string) => void
  readonly handlePhotoChange: (fileList: FileList | null) => Promise<void>
  readonly handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
}

export function usePetRegistrationForm(t: TFunction): PetRegistrationFormState {
  const [name, setName] = useState("")
  const [breed, setBreed] = useState("")
  const [category, setCategory] = useState<PetCategory>("DOG")
  const [photo, setPhoto] = useState<File | null>(null)
  const [status, setStatus] = useState<PetRegistrationStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [isPhotoValidationPending, setIsPhotoValidationPending] = useState(false)
  const validationSequence = useRef(0)
  const submitting = useRef(false)

  async function handlePhotoChange(fileList: FileList | null) {
    const [file] = Array.from(fileList ?? [])
    const currentSequence = validationSequence.current + 1
    validationSequence.current = currentSequence

    if (file === undefined) {
      setPhoto(null)
      setIsPhotoValidationPending(false)
      return
    }

    setIsPhotoValidationPending(true)
    const result = await validateImageFile(file)

    if (validationSequence.current !== currentSequence) {
      return
    }

    setIsPhotoValidationPending(false)

    if (result.kind === "invalid") {
      setPhoto(null)
      setError(t(($) => $.create.imageErrors[result.reason]))
      setStatus("error")
      return
    }

    setPhoto(file)
    setError(null)
    setStatus("idle")
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting.current || status === "saving" || isPhotoValidationPending) {
      return
    }

    const trimmedName = name.trim()
    const trimmedBreed = breed.trim()

    if (trimmedName === "" || trimmedBreed === "") {
      setError(t(($) => $.my.petForm.required))
      setStatus("error")
      return
    }

    submitting.current = true
    setStatus("saving")
    setError(null)

    try {
      await registerLocalPet(
        photo === null
          ? { name: trimmedName, breed: trimmedBreed, category }
          : { name: trimmedName, breed: trimmedBreed, category, photo },
      )
      setName("")
      setBreed("")
      setPhoto(null)
      setStatus("saved")
    } catch {
      setStatus("error")
      setError(t(($) => $.manage.storageProblem))
    } finally {
      submitting.current = false
    }
  }

  return {
    breed,
    category,
    error,
    isSubmitDisabled: status === "saving" || isPhotoValidationPending,
    name,
    status,
    handleBreedChange: setBreed,
    handleCategoryChange: setCategory,
    handleNameChange: setName,
    handlePhotoChange,
    handleSubmit,
  }
}
