import { createClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "../../services/supabaseClient"
import { accountClient, cloudMutation, CloudError } from "../cloud/cloudApi"

export interface SocialPost {
  avatar?: string | null
  id: string
  owner: string
  username: string
  name: string
  pet: string
  category: string
  asset: string
  content: string
  created: string
  likes: number
  comments: number
  liked: boolean
  following: boolean
}
export interface SocialPerson {
  id: string
  username: string
  name: string
  following: boolean
}
export interface SocialComment {
  id: string
  owner: string
  username: string
  content: string
  created: string
}
export interface Story {
  id: string
  owner: string
  username: string
  name: string
  asset: string
  caption: string
  created: string
  expires: string
  viewed: boolean
  views: number | null
}
type Row = Record<string, unknown>
const string = (r: Row, k: string) => {
  if (typeof r[k] !== "string") throw new CloudError("request")
  return r[k]
}
const count = (r: Row, k: string) => {
  const n = Number(r[k])
  if (!Number.isFinite(n)) throw new CloudError("request")
  return n
}
export async function socialClient(owner: string | null) {
  if (owner) return accountClient(owner)
  if (!getSupabaseClient()) throw new CloudError("setup")
  return createClient(
    import.meta.env["VITE_SUPABASE_URL"] as string,
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
    { accessToken: () => Promise.resolve(null) },
  )
}
async function list(
  owner: string | null,
  name: string,
  args: Record<string, unknown> = {},
): Promise<Row[]> {
  const result = await (await socialClient(owner)).rpc(name, args)
  if (result.error) throw new CloudError(result.error.code === "PGRST202" ? "setup" : "request")
  const data: unknown = result.data
  if (!Array.isArray(data)) throw new CloudError("request")
  return data.map((value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new CloudError("request")
    return value as Row
  })
}
export async function socialPosts(
  owner: string | null,
  args: Record<string, unknown> = {},
): Promise<SocialPost[]> {
  return (await list(owner, "social_feed", args)).map((r) => ({
    avatar: typeof r["avatar_asset_id"] === "string" ? r["avatar_asset_id"] : null,
    id: string(r, "id"),
    owner: string(r, "owner_id"),
    username: string(r, "username"),
    name: string(r, "display_name"),
    pet: string(r, "pet_name"),
    category: string(r, "category"),
    asset: string(r, "asset_id"),
    content: string(r, "content"),
    created: string(r, "created_at"),
    likes: count(r, "likes"),
    comments: count(r, "comments"),
    liked: r["liked"] === true,
    following: r["following"] === true,
  }))
}
export async function socialPeople(owner: string | null, search = ""): Promise<SocialPerson[]> {
  return (await list(owner, "social_people", { p_search: search })).map((r) => ({
    id: string(r, "id"),
    username: string(r, "username"),
    name: string(r, "display_name"),
    following: r["following"] === true,
  }))
}
export async function socialComments(
  owner: string | null,
  post: string,
  args: Record<string, unknown> = {},
): Promise<SocialComment[]> {
  return (await list(owner, "social_comments", { p_post: post, ...args })).map((r) => ({
    id: string(r, "id"),
    owner: string(r, "owner_id"),
    username: string(r, "username"),
    content: string(r, "content"),
    created: string(r, "created_at"),
  }))
}
export async function socialStories(owner: string): Promise<Story[]> {
  return (await list(owner, "stories_feed")).map((r) => ({
    id: string(r, "id"),
    owner: string(r, "owner_id"),
    username: string(r, "username"),
    name: string(r, "display_name"),
    asset: string(r, "asset_id"),
    caption: string(r, "caption"),
    created: string(r, "created_at"),
    expires: string(r, "expires_at"),
    viewed: r["viewed"] === true,
    views: r["views"] === null ? null : count(r, "views"),
  }))
}
export async function socialWrite(owner: string, name: string, args: Record<string, unknown> = {}) {
  if (name !== "ensure_profile") await cloudMutation(owner, "ensure_profile", {})
  await cloudMutation(owner, name, args)
}

export interface SocialProfile {
  id: string
  username: string
  name: string
  bio: string
  avatar: string | null
  posts: number
  followers: number
  followingCount: number
  following: boolean
  version: number | null
}
export async function socialProfile(
  owner: string | null,
  username: string | null = null,
): Promise<SocialProfile | null> {
  const r = (await list(owner, "social_profile", { p_username: username }))[0]
  return r
    ? {
        id: string(r, "id"),
        username: string(r, "username"),
        name: string(r, "display_name"),
        bio: string(r, "bio"),
        avatar: typeof r["avatar_asset_id"] === "string" ? r["avatar_asset_id"] : null,
        posts: count(r, "posts"),
        followers: count(r, "followers"),
        followingCount: count(r, "following_count"),
        following: r["following"] === true,
        version: r["version"] === null ? null : count(r, "version"),
      }
    : null
}
export class ProfileIssue extends Error {
  constructor(readonly kind: "username" | "conflict" | "validation" | "request" | "image") {
    super(kind)
  }
}
export async function saveSocialProfile(owner: string, args: Record<string, unknown>) {
  const result = await (await socialClient(owner)).rpc("save_social_profile", args)
  if (result.error)
    throw new ProfileIssue(
      result.error.code === "23505"
        ? "username"
        : result.error.code === "PT409"
          ? "conflict"
          : result.error.code === "22023" || result.error.code === "23514"
            ? "validation"
            : "request",
    )
}
export async function socialImage(
  owner: string | null,
  asset: string,
  signal: AbortSignal,
): Promise<Blob> {
  const shared = getSupabaseClient()
  if (!shared) throw new CloudError("setup")
  const headers: Record<string, string> = {
    apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
  }
  if (owner) {
    const { data, error } = await shared.auth.getSession()
    if (error || data.session?.user.id !== owner) throw new CloudError("account")
    const token = data.session.access_token
    const verified = await shared.auth.getUser(token)
    if (verified.error || verified.data.user.id !== owner) throw new CloudError("account")
    headers["Authorization"] = "Bearer " + token
  }
  const response = await fetch(
    `${import.meta.env["VITE_SUPABASE_URL"] as string}/functions/v1/social-media?asset=${encodeURIComponent(asset)}`,
    { headers, signal, cache: "no-store" },
  )
  if (!response.ok) throw new CloudError("image")
  return response.blob()
}
