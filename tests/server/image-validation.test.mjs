import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { before, test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  ImageMagick,
  MagickColors,
  MagickFormat,
  MagickImageInfo,
  ResourceLimits,
  initializeImageMagick,
} from "@imagemagick/magick-wasm"
import { validateImage } from "../../supabase/functions/_shared/imageValidation.mjs"

before(async () => {
  await initializeImageMagick(
    await readFile(fileURLToPath(import.meta.resolve("@imagemagick/magick-wasm/magick.wasm"))),
  )
})
function fixture(format, width = 16, height = 12) {
  ResourceLimits.width = 4096n
  ResourceLimits.height = 4096n
  ResourceLimits.area = 16000000n
  ResourceLimits.memory = 256n * 1024n * 1024n
  ResourceLimits.maxMemoryRequest = 256n * 1024n * 1024n
  ResourceLimits.listLength = 16n
  return ImageMagick.read(MagickColors.Red, width, height, (image) =>
    image.write(format, (bytes) => new Uint8Array(bytes)),
  )
}
test("actually decodes JPEG, PNG and WebP and re-encodes a bounded WebP", () => {
  for (const [format, mime] of [
    [MagickFormat.Jpeg, "image/jpeg"],
    [MagickFormat.Png, "image/png"],
    [MagickFormat.WebP, "image/webp"],
  ]) {
    const result = validateImage(fixture(format), mime)
    const info = MagickImageInfo.create(result.bytes)
    assert.equal(info.format, MagickFormat.WebP)
    assert.equal(info.width, 16)
    assert.equal(info.height, 12)
  }
})
test("rejects invalid bytes, mismatched MIME and over-limit files", () => {
  assert.throws(() => validateImage(new Uint8Array([1, 2, 3]), "image/png"))
  assert.throws(() => validateImage(fixture(MagickFormat.Png), "image/jpeg"), /mime_mismatch/)
  assert.throws(
    () => validateImage(new Uint8Array(5 * 1024 * 1024 + 1), "image/png"),
    /invalid_size/,
  )
  assert.throws(() => validateImage(fixture(MagickFormat.Png), "image/svg+xml"), /unsupported_type/)
})
test("rejects excessive pixel count before full decode", () => {
  const bytes = fixture(MagickFormat.Png, 3000, 3000)
  assert.throws(() => validateImage(bytes, "image/png"), /invalid_dimensions/)
})

test("honors the smaller Edge image budget", () => {
  const limits = { maxDimension: 1600, maxPixels: 2000000 }
  assert.equal(validateImage(fixture(MagickFormat.Png, 1280, 720), "image/png", limits).width, 1280)
  assert.throws(() => validateImage(fixture(MagickFormat.Png, 1600, 1600), "image/png", limits))
})
