import { createClient } from "@supabase/supabase-js"
import { handleAccountOperations } from "../_shared/operationsHandler.mjs"
const base = Deno.env.get("SUPABASE_URL")!,
  key = Deno.env.get("SUPABASE_ANON_KEY")!,
  admin = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
Deno.serve((request) =>
  handleAccountOperations(request, {
    origins: (
      Deno.env.get("APP_ORIGINS") ??
      "https://ilove-pets-web.pages.dev,http://127.0.0.1:5173,http://127.0.0.1:5174"
    ).split(","),
    userClient: (token: string) =>
      createClient(base, key, {
        global: { headers: { Authorization: "Bearer " + token } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    adminClient: () =>
      createClient(base, admin, { auth: { persistSession: false, autoRefreshToken: false } }),
  }),
)
