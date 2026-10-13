export const acceptedImageTypes: readonly string[] = ["image/jpeg", "image/png", "image/webp"]
export const maxImageBytes = 5 * 1024 * 1024

export type ImageValidationFailure = "type" | "size" | "decode"

export type ImageValidationResult =
  { readonly kind: "valid" } | { readonly kind: "invalid"; readonly reason: ImageValidationFailure }

export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (!acceptedImageTypes.includes(file.type)) {
    return { kind: "invalid", reason: "type" }
  }

  if (file.size > maxImageBytes) {
    return { kind: "invalid", reason: "size" }
  }

  if (!(await canDecodeImage(file))) {
    return { kind: "invalid", reason: "decode" }
  }

  return { kind: "valid" }
}

async function canDecodeImage(file: File): Promise<boolean> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      bitmap.close()
      return true
    } catch (error) {
      if (error instanceof Error || error instanceof DOMException) {
        return false
      }
      throw error
    }
  }

  return new Promise((resolve) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image.naturalWidth > 0 && image.naturalHeight > 0)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(false)
    }
    image.src = objectUrl
  })
}
