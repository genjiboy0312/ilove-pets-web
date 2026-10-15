import { copyFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
await copyFile(
  fileURLToPath(import.meta.resolve("@imagemagick/magick-wasm/magick.wasm")),
  new URL("../supabase/functions/cloud-media/magick.wasm", import.meta.url),
)
