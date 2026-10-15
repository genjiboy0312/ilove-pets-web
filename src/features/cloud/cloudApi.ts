import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import { PET_CATEGORY_IDS } from "../../constants/petCategories"
import { getSupabaseClient } from "../../services/supabaseClient"
import { prepareCloudImage } from "./prepareCloudImage"
import type { CloudAsset, CloudGrowth, CloudPet, CloudPost, CloudSnapshot } from "./cloudTypes"

export class CloudError extends Error {
  constructor(
    readonly kind: "account" | "conflict" | "linked" | "quota" | "setup" | "request" | "image",
  ) {
    super(kind)
  }
}
export async function accountClient(owner: string): Promise<SupabaseClient> {
  const client = getSupabaseClient()
  if (!client) throw new CloudError("setup")
  const { data, error } = await client.auth.getSession()
  const token = data.session?.access_token
  if (error || !token) throw new CloudError("account")
  const verified = await client.auth.getUser(token)
  if (verified.error || verified.data.user.id !== owner || !verified.data.user.email_confirmed_at)
    throw new CloudError("account")
  const url: unknown = import.meta.env["VITE_SUPABASE_URL"]
  const key: unknown = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]
  if (typeof url !== "string" || typeof key !== "string") throw new CloudError("setup")
  // Pin the operation to its starting account even if another tab changes the shared session.
  return createClient(url, key, { accessToken: () => Promise.resolve(token) })
}
function fail(error: { readonly code?: string; readonly message: string }): never {
  const code = error.code
  throw new CloudError(
    code === "PT409" || code === "40001"
      ? "conflict"
      : code === "23503"
        ? "linked"
        : code === "54000"
          ? "quota"
          : code === "PGRST202" || code === "PGRST205" || code === "42703"
            ? "setup"
            : "request",
  )
}
async function rpc(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const result = await client.rpc(name, args)
  if (result.error) fail(result.error)
  return result.data as unknown
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new CloudError("request")
  return value as Record<string, unknown>
}
function text(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  if (typeof value !== "string") throw new CloudError("request")
  return value
}
function number(row: Record<string, unknown>, key: string): number {
  const value = row[key]
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  if (!Number.isFinite(parsed)) throw new CloudError("request")
  return parsed
}
async function rows(
  client: SupabaseClient,
  table: string,
  owner: string,
): Promise<readonly Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  for (let offset = 0; offset < 5000; offset += 250) {
    let query = client
      .from(table)
      .select("*")
      .eq("owner_id", owner)
      .order("id")
      .range(offset, offset + 249)
    if (table === "posts") query = query.is("deleted_at", null)
    const result = await query
    if (result.error) fail(result.error)
    const data: unknown = result.data
    if (!Array.isArray(data)) throw new CloudError("request")
    const page = data.map((value: unknown) => record(value))
    if (page.some((row) => row["owner_id"] !== owner)) throw new CloudError("account")
    all.push(...page)
    if (page.length < 250) return all
  }
  throw new CloudError("request")
}
export async function loadCloud(owner: string): Promise<CloudSnapshot> {
  const client = await accountClient(owner)
  await rpc(client, "ensure_profile")
  if ((await rpc(client, "cloud_version")) !== 2) throw new CloudError("setup")
  const mediaStatus = await client.functions.invoke("cloud-media", {
    body: { action: "status" },
    timeout: 15000,
  })
  const mediaData: unknown = mediaStatus.data
  const mediaReady =
    !mediaStatus.error &&
    typeof mediaData === "object" &&
    mediaData !== null &&
    "ready" in mediaData &&
    mediaData.ready === true
  const [pets, growth, posts, assets] = await Promise.all(
    ["pets", "growth_records", "posts", "media_assets"].map((table) => rows(client, table, owner)),
  )
  if (!pets || !growth || !posts || !assets) throw new CloudError("request")
  const ownStories = await client.rpc("own_story_assets")
  const storyAssets: unknown = ownStories.data
  return {
    storyAssets:
      !ownStories.error && Array.isArray(storyAssets)
        ? storyAssets.filter((value: unknown): value is string => typeof value === "string")
        : [],
    mediaReady,
    pets: pets.map((row): CloudPet => {
      const category = PET_CATEGORY_IDS.find((value) => value === row["category"])
      if (!category) throw new CloudError("request")
      return {
        id: text(row, "id"),
        name: text(row, "name"),
        breed: text(row, "breed"),
        category,
        version: number(row, "version"),
      }
    }),
    growth: growth.map((row): CloudGrowth => ({
      id: text(row, "id"),
      petId: text(row, "pet_id"),
      date: text(row, "record_date"),
      weight: row["weight_kg"] === null ? null : number(row, "weight_kg"),
      note: text(row, "note"),
      version: number(row, "version"),
    })),
    posts: posts.map((row): CloudPost => ({
      visibility: row["visibility"] === "public" ? "public" : "private",
      id: text(row, "id"),
      petId: text(row, "pet_id"),
      assetId: text(row, "asset_id"),
      content: text(row, "content"),
      version: number(row, "version"),
    })),
    assets: assets.map((row): CloudAsset => ({
      id: text(row, "id"),
      key: row["display_key"] === null ? null : text(row, "display_key"),
      status: text(row, "status"),
      bytes: number(row, "reserved_bytes"),
    })),
  }
}
export async function cloudMutation(
  owner: string,
  name: string,
  args: Record<string, unknown>,
): Promise<void> {
  const client = await accountClient(owner)
  await rpc(client, name, args)
}
export async function signedCloudImage(owner: string, key: string): Promise<string> {
  if (!key.startsWith(owner + "/")) throw new CloudError("account")
  const client = await accountClient(owner)
  const result = await client.storage.from("pet-media").createSignedUrl(key, 60)
  if (result.error) throw new CloudError("request")
  return result.data.signedUrl
}
async function invoke(client: SupabaseClient, body: Record<string, unknown>): Promise<void> {
  const result = await client.functions.invoke("cloud-media", { body, timeout: 45000 })
  if (result.error) throw new CloudError("image")
}
export async function cleanupCloudMedia(owner: string): Promise<void> {
  await invoke(await accountClient(owner), { action: "cleanup" })
}
export async function uploadCloudImage(
  owner: string,
  file: File,
  purpose: "post_photo" | "profile_avatar" = "post_photo",
): Promise<string> {
  if (
    file.size < 1 ||
    file.size > 5242880 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new CloudError("image")
  const client = await accountClient(owner)
  let upload: File
  try {
    upload = await prepareCloudImage(file)
  } catch {
    throw new CloudError("image")
  }
  const asset = record(
    await rpc(client, "reserve_media", {
      p_bytes: upload.size,
      p_mime_type: upload.type,
      p_purpose: purpose,
    }),
  )
  const id = text(asset, "id")
  try {
    const key = text(asset, "object_key")
    if (!key.startsWith(owner + "/")) throw new CloudError("account")
    const result = await client.storage
      .from("pet-media")
      .upload(key, upload, { contentType: upload.type, upsert: false, cacheControl: "0" })
    if (result.error) throw new CloudError("image")
    await invoke(client, { action: "finalize", assetId: id })
    return id
  } catch (error) {
    try {
      await rpc(client, "discard_media", { p_id: id })
      await invoke(client, { action: "cleanup" })
    } catch {
      /* Retain charged reservation; show cleanup controls after reload. */
    }
    throw error
  }
}
