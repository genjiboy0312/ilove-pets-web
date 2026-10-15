// Supabase Edge entry point. Project secrets are available only in this server runtime.
import { createClient } from "@supabase/supabase-js"
import { initializeImageMagick } from "@imagemagick/magick-wasm"
import { validateImage } from "../_shared/imageValidation.mjs"
import { handleMediaRequest } from "../_shared/mediaHandler.mjs"
import { loadRuntimeWasm } from "../_shared/runtimeAsset.mjs"

const base = Deno.env.get("SUPABASE_URL")!
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!
const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const origins = (
  Deno.env.get("APP_ORIGINS") ??
  "https://ilove-pets-web.pages.dev,http://127.0.0.1:5173,http://127.0.0.1:5174"
).split(",")
let initialized: Promise<void> | undefined
const initialize = () =>
  (initialized ??= (async () => {
    const wasm = await loadRuntimeWasm(base, adminKey)
    await initializeImageMagick(wasm)
  })().catch((error) => {
    initialized = undefined
    throw error
  }))

Deno.serve((request) =>
  handleMediaRequest(request, {
    origins,
    prepare: initialize,
    userClient: (token: string) =>
      createClient(base, publicKey, {
        global: { headers: { Authorization: token } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    adminClient: () =>
      createClient(base, adminKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    decode: async (bytes: Uint8Array, mime: string) => {
      await initialize()
      return validateImage(bytes, mime, { maxDimension: 1600, maxPixels: 2000000 })
    },
  }),
)
