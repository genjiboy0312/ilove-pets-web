import {
  ImageMagick,
  MagickFormat,
  MagickImageInfo,
  ResourceLimits,
} from "@imagemagick/magick-wasm"

// Initialize the WASM runtime once in the caller. This module is server-only.
export function validateImage(bytes, claimedMime, limits = {}) {
  const maxDimension = limits.maxDimension ?? 4096
  const maxPixels = limits.maxPixels ?? 8000000
  if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > 5 * 1024 * 1024)
    throw new Error("invalid_size")
  const formats = {
    "image/jpeg": MagickFormat.Jpeg,
    "image/png": MagickFormat.Png,
    "image/webp": MagickFormat.WebP,
  }
  const expected = formats[claimedMime]
  if (!expected) throw new Error("unsupported_type")
  // Limits apply before even the header probe; reject multi-frame images.
  ResourceLimits.width = BigInt(maxDimension)
  ResourceLimits.height = BigInt(maxDimension)
  ResourceLimits.area = BigInt(maxPixels)
  ResourceLimits.memory = 96n * 1024n * 1024n
  ResourceLimits.maxMemoryRequest = 64n * 1024n * 1024n
  ResourceLimits.disk = 0n
  ResourceLimits.listLength = 8n
  ResourceLimits.time = 5n
  ResourceLimits.maxProfileSize = 1024n * 1024n
  const info = MagickImageInfo.create(bytes)
  if (info.format !== expected) throw new Error("mime_mismatch")
  if (
    info.width < 1 ||
    info.height < 1 ||
    info.width > maxDimension ||
    info.height > maxDimension ||
    info.width * info.height > maxPixels
  )
    throw new Error("invalid_dimensions")
  return ImageMagick.readCollection(bytes, (images) => {
    if (images.length !== 1) throw new Error("animated_image")
    const image = images.at(0)
    image.autoOrient()
    image.strip()
    if (Math.max(image.width, image.height) > 1600) {
      const scale = 1600 / Math.max(image.width, image.height)
      image.resize(Math.round(image.width * scale), Math.round(image.height * scale))
    }
    image.quality = 82
    return image.write(MagickFormat.WebP, (data) => ({
      bytes: new Uint8Array(data),
      mime: "image/webp",
      width: image.width,
      height: image.height,
    }))
  })
}
