import { createClient } from "@supabase/supabase-js"
import { handleMaintenance } from "../_shared/operationsHandler.mjs"
Deno.serve((request) =>
  handleMaintenance(request, {
    secret: Deno.env.get("MAINTENANCE_SECRET"),
    adminClient: () =>
      createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
  }),
)
