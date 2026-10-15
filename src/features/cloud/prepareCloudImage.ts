// Reduce upload bandwidth and Edge CPU cost. The server still decodes and validates independently.
export async function prepareCloudImage(file: File): Promise<File> {
  let bitmap: ImageBitmap | undefined
  let objectUrl: string | undefined
  try {
    let source: CanvasImageSource
    let width: number, height: number
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
      source = bitmap
      width = bitmap.width
      height = bitmap.height
    } else {
      objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.src = objectUrl
      await image.decode()
      source = image
      width = image.naturalWidth
      height = image.naturalHeight
    }
    if (width < 1 || height < 1 || width * height > 40000000) throw new Error("invalid_image")
    const scale = Math.min(1, 1280 / Math.max(width, height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("image_unavailable")
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (value) resolve(value)
          else reject(new Error("encode_failed"))
        },
        "image/webp",
        0.82,
      )
    })
    if (blob.size < 1 || blob.size > 5242880 || !["image/webp", "image/png"].includes(blob.type))
      throw new Error("invalid_image")
    return new File([blob], "photo." + (blob.type === "image/webp" ? "webp" : "png"), {
      type: blob.type,
    })
  } finally {
    bitmap?.close()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
