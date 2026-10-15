import { createClient } from "@supabase/supabase-js"
import { handleSocialMedia } from "../_shared/socialMediaHandler.mjs"
const base = Deno.env.get("SUPABASE_URL")!
const key = Deno.env.get("SUPABASE_ANON_KEY")!
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const origins = (
  Deno.env.get("APP_ORIGINS") ??
  "https://ilove-pets-web.pages.dev,http://127.0.0.1:5173,http://127.0.0.1:5174"
).split(",")
Deno.serve((request) =>
  handleSocialMedia(request, {
    origins,
    userClient: (authorization: string | null) =>
      createClient(base, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        ...(authorization ? { global: { headers: { Authorization: authorization } } } : {}),
      }),
    download: (path: string) =>
      createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } })
        .storage.from("pet-media")
        .download(path),
  }),
)
