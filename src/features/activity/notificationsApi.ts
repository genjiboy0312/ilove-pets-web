import { accountClient, CloudError } from "../cloud/cloudApi"

export interface Notification {
  id: string
  kind: "follow" | "like" | "comment"
  actor: string
  username: string | null
  post: string | null
  created: string
  read: boolean
}
export async function notificationPage(
  owner: string,
  before?: Notification,
): Promise<Notification[]> {
  const result = await (
    await accountClient(owner)
  ).rpc("notifications_feed", before ? { p_before: before.created, p_before_id: before.id } : {})
  const data: unknown = result.data
  if (result.error || !Array.isArray(data)) throw new CloudError("request")
  return data.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new CloudError("request")
    const r = value as Record<string, unknown>
    if (
      typeof r["id"] !== "string" ||
      typeof r["actor_name"] !== "string" ||
      typeof r["created_at"] !== "string" ||
      !["follow", "like", "comment"].includes(String(r["kind"]))
    )
      throw new CloudError("request")
    return {
      id: r["id"],
      kind: r["kind"] as Notification["kind"],
      actor: r["actor_name"],
      username: typeof r["actor_username"] === "string" ? r["actor_username"] : null,
      post: typeof r["post_id"] === "string" ? r["post_id"] : null,
      created: r["created_at"],
      read: r["read_at"] !== null,
    }
  })
}
export async function notificationUnread(owner: string): Promise<number> {
  const result = await (await accountClient(owner)).rpc("notifications_unread")
  const value = Number(result.data)
  if (result.error || !Number.isSafeInteger(value) || value < 0) throw new CloudError("request")
  return value
}
export function notificationsChanged() {
  window.dispatchEvent(new Event("notifications-changed"))
}
