import { isRecordDate } from "./localContentMetadata"
import type { GrowthRecord } from "./localContentTypes"

export function localDate(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function isGrowthInputValid(input: Omit<GrowthRecord, "id">): boolean {
  return (
    isRecordDate(input.date) &&
    input.date <= localDate() &&
    input.note.length <= 500 &&
    (input.weightKg !== undefined || input.note.trim() !== "") &&
    (input.weightKg === undefined ||
      (Number.isFinite(input.weightKg) && input.weightKg > 0 && input.weightKg <= 1000))
  )
}
