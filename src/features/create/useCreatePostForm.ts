import { useEffect, useMemo, useRef, useState } from "react"
import type { SyntheticEvent } from "react"
import type { TFunction } from "i18next"

import type { MyProfile } from "../my/myData"
import { validateImageFile } from "../local/imageValidation"
import {
  clearCreateDraft,
  publishLocalPost,
  readCreateDraft,
  writeCreateDraft,
} from "../local/localContentStore"
import { parseSelectedPetId, parseTags } from "../local/localContentParsing"

const AI_GENERATION_DELAY_MS = 600

export type AiState = "idle" | "loading" | "done"
export type PublishState = "idle" | "pending" | "success" | "error"

export interface CreatePostFormState {
  readonly aiState: AiState
  readonly draft: ReturnType<typeof readCreateDraft>
  readonly isSubmitDisabled: boolean
  readonly previewUrl: string | null
  readonly publishError: string | null
  readonly publishState: PublishState
  readonly suggestions: readonly string[]
  readonly handleAiSuggest: () => void
  readonly handleContentChange: (value: string) => void
  readonly handlePetChange: (value: string) => void
  readonly handlePhotoChange: (fileList: FileList | null) => Promise<void>
  readonly handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
  readonly handleSuggestionPick: (suggestion: string) => void
  readonly handleTagsChange: (value: string) => void
}

export function useCreatePostForm(t: TFunction, profile: MyProfile): CreatePostFormState {
  const [draft, setDraft] = useState(() => readCreateDraft())
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [aiState, setAiState] = useState<AiState>("idle")
  const [publishState, setPublishState] = useState<PublishState>("idle")
  const [publishError, setPublishError] = useState<string | null>(null)
  const [isPhotoValidationPending, setIsPhotoValidationPending] = useState(false)
  const validationSequence = useRef(0)
  const submitting = useRef(false)

  const suggestions = useMemo(
    () => [
      t(($) => $.create.aiSuggestion1),
      t(($) => $.create.aiSuggestion2),
      t(($) => $.create.aiSuggestion3),
    ],
    [t],
  )
  const isSubmitDisabled = publishState === "pending" || isPhotoValidationPending

  useEffect(() => {
    try {
      writeCreateDraft(draft)
    } catch (error) {
      if (error instanceof DOMException) {
        setPublishState("error")
        setPublishError(t(($) => $.manage.storageProblem))
        return
      }
      throw error
    }
  }, [draft, t])

  useEffect(() => {
    if (photoFile === null) {
      setPreviewUrl(null)
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(photoFile)
    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [photoFile])

  function handleAiSuggest() {
    setAiState("loading")
    window.setTimeout(() => {
      setAiState("done")
    }, AI_GENERATION_DELAY_MS)
  }

  async function handlePhotoChange(fileList: FileList | null) {
    const [file] = Array.from(fileList ?? [])
    const currentSequence = validationSequence.current + 1
    validationSequence.current = currentSequence

    if (file === undefined) {
      setPhotoFile(null)
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
      setPhotoFile(null)
      setPublishState("error")
      setPublishError(t(($) => $.create.imageErrors[result.reason]))
      return
    }

    setPhotoFile(file)
    setPublishState("idle")
    setPublishError(null)
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting.current || isSubmitDisabled) {
      return
    }

    const petId = parseSelectedPetId(draft.petId)
    const content = draft.content.trim()
    const tags = parseTags(draft.tags)
    const canUsePet = profile.pets.some((pet) => pet.petId === petId)

    if (petId === null || !canUsePet || content === "" || photoFile === null) {
      setPublishState("error")
      setPublishError(t(($) => $.create.validation.required))
      return
    }

    submitting.current = true
    setPublishState("pending")
    setPublishError(null)

    try {
      await publishLocalPost({ petId, image: photoFile, content, tags })
      clearDraftAfterPublish()
    } catch {
      setPublishState("error")
      setPublishError(t(($) => $.manage.storageProblem))
    } finally {
      submitting.current = false
    }
  }

  function clearDraftAfterPublish() {
    try {
      clearCreateDraft()
    } catch (error) {
      if (!(error instanceof DOMException)) {
        throw error
      }
    }

    setDraft({ petId: "", content: "", tags: "" })
    setPhotoFile(null)
    setAiState("idle")
    setPublishState("success")
  }

  return {
    aiState,
    draft,
    isSubmitDisabled,
    previewUrl,
    publishError,
    publishState,
    suggestions,
    handleAiSuggest,
    handleContentChange: (content) => {
      setDraft((current) => ({ ...current, content }))
    },
    handlePetChange: (value) => {
      const petId = value === "" ? "" : parseSelectedPetId(value)
      if (petId !== null) {
        setDraft((current) => ({ ...current, petId }))
      }
    },
    handlePhotoChange,
    handleSubmit,
    handleSuggestionPick: (suggestion) => {
      setDraft((current) => ({ ...current, content: suggestion }))
      setAiState("idle")
    },
    handleTagsChange: (tags) => {
      setDraft((current) => ({ ...current, tags }))
    },
  }
}
