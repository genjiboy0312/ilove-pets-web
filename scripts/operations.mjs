import { createClient } from "@supabase/supabase-js"
import { publicProject, serviceKey } from "./operations-client.mjs"
const { url, ref } = publicProject()
const admin = createClient(url, serviceKey(ref), {
  auth: { persistSession: false, autoRefreshToken: false },
})
const [command, id, action] = process.argv.slice(2)
if (command === "health") {
  const result = await admin.rpc("ops_health")
  if (result.error) throw new Error("Health unavailable")
  console.log(JSON.stringify(result.data, null, 2))
  if (
    result.data.failedCleanup > 0 ||
    result.data.failedDeletion > 0 ||
    result.data.lastRunFailures > 0 ||
    !result.data.lastRun ||
    Date.now() - Date.parse(result.data.lastRun) > 60 * 60 * 1000
  )
    process.exitCode = 1
} else if (command === "reports") {
  const result = await admin
    .from("content_reports")
    .select("id,target_kind,target_id,reason,status,created_at")
    .eq("status", "open")
    .order("created_at")
    .limit(100)
  if (result.error) throw new Error("Reports unavailable")
  console.log(JSON.stringify(result.data, null, 2))
} else if (
  command === "report" &&
  /^[0-9a-f-]{36}$/i.test(id ?? "") &&
  ["view", "hide", "dismiss"].includes(action)
) {
  if (action === "view") {
    const result = await admin
      .from("content_reports")
      .select("id,target_kind,target_id,reason,detail,status,created_at")
      .eq("id", id)
      .single()
    if (result.error) throw new Error("Report unavailable")
    console.log(JSON.stringify(result.data, null, 2))
  } else {
    const result = await admin.rpc("ops_resolve_report", { p_id: id, p_hide: action === "hide" })
    if (result.error) throw new Error("Report resolution failed")
    console.log("Report resolved.")
  }
} else
  throw new Error(
    "Usage: node scripts/operations.mjs health | reports | report UUID view|hide|dismiss",
  )
