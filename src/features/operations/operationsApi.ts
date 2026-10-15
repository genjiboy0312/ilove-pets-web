import { accountClient, CloudError } from "../cloud/cloudApi"
import { getSupabaseClient } from "../../services/supabaseClient"
export class OperationError extends Error {
  constructor(readonly kind: "request" | "rateLimit" | "reauth" | "setup") {
    super(kind)
  }
}
export async function operation(owner: string, name: string, args: Record<string, unknown> = {}) {
  const result = await (await accountClient(owner)).rpc(name, args)
  if (result.error)
    throw new OperationError(
      result.error.code === "PT429"
        ? "rateLimit"
        : result.error.code === "PGRST202"
          ? "setup"
          : "request",
    )
  return result.data as unknown
}
export interface BlockedUser {
  readonly id: string
  readonly username: string
  readonly display_name: string
}
export async function blockedUsers(
  owner: string,
  after: string | null = null,
): Promise<BlockedUser[]> {
  const data = await operation(owner, "blocked_users", { p_after: after })
  if (!Array.isArray(data)) throw new OperationError("request")
  return data.map((row: unknown) => {
    if (
      !row ||
      typeof row !== "object" ||
      !("id" in row) ||
      !("username" in row) ||
      !("display_name" in row) ||
      typeof row.id !== "string" ||
      typeof row.username !== "string" ||
      typeof row.display_name !== "string"
    )
      throw new OperationError("request")
    return { id: row.id, username: row.username, display_name: row.display_name }
  })
}
export function safetyChanged() {
  window.dispatchEvent(new Event("social-follow-changed"))
  window.dispatchEvent(new Event("social-profile-changed"))
  window.dispatchEvent(new Event("notifications-changed"))
}
export async function requestAccountDeletion(owner: string) {
  const result = await (
    await accountClient(owner)
  ).functions.invoke("account-operations", {
    body: { action: "delete_account", confirm: "DELETE" },
    timeout: 30000,
  })
  if (result.error) {
    let code = ""
    const context: unknown = Reflect.get(result.error, "context")
    if (context instanceof Response) {
      try {
        const value: unknown = await context.json()
        if (
          value &&
          typeof value === "object" &&
          "error" in value &&
          typeof value.error === "string"
        )
          code = value.error
      } catch {
        /* Generic message only. */
      }
    }
    throw new OperationError(code === "reauthentication_required" ? "reauth" : "request")
  }
  const data: unknown = result.data
  if (!data || typeof data !== "object" || !("status" in data) || data.status !== "accepted")
    throw new OperationError("request")
  const current = getSupabaseClient()
  if (!current) throw new CloudError("setup")
  const session = await current.auth.getSession()
  if (session.data.session?.user.id === owner) await current.auth.signOut({ scope: "local" })
}
