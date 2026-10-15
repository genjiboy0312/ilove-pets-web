import type { Page } from "@playwright/test"
export const owner = "00000000-0000-0000-0000-000000000002",
  author = "00000000-0000-0000-0000-000000000001",
  post = "10000000-0000-0000-0000-000000000001",
  asset = "20000000-0000-0000-0000-000000000001"
export async function setup(page: Page, language = "ko") {
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas")
      c.width = 32
      c.height = 24
      const ctx = c.getContext("2d")
      if (!ctx) throw new Error("canvas")
      ctx.fillStyle = "#c86d60"
      ctx.fillRect(0, 0, 32, 24)
      return c.toDataURL("image/png").split(",")[1] ?? ""
    }),
    "base64",
  )
  let following = true,
    liked = false,
    viewed = false
  const comments: Record<string, unknown>[] = []
  const ownStories: Record<string, unknown>[] = []
  const ownProfile: Record<string, unknown> = {
    id: owner,
    username: "my_family",
    display_name: "우리집",
    bio: "기존 소개",
    avatar_asset_id: null,
    posts: 0,
    followers: 0,
    following_count: 1,
    following: false,
    version: 1,
  }
  const ownPosts: Record<string, unknown>[] = []
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
      })
    if (url.pathname === "/auth/v1/user")
      return json({
        id: owner,
        aud: "authenticated",
        email: "test@example.invalid",
        email_confirmed_at: "2026-10-15",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-10-15",
      })
    if (url.pathname === "/functions/v1/social-media")
      return route.fulfill({
        contentType: "image/png",
        body: png,
        headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
      })
    if (url.pathname === "/functions/v1/cloud-media") return json({ ready: true, assetId: asset })
    if (url.pathname.startsWith("/storage/v1/object/")) return json({ Key: "pet-media/original" })
    if (url.pathname === "/rest/v1/pets")
      return json([
        { id: owner, owner_id: owner, name: "구름이", breed: "Mix", category: "CAT", version: 1 },
      ])
    if (url.pathname === "/rest/v1/posts") return json(ownPosts)
    if (url.pathname === "/rest/v1/growth_records" || url.pathname === "/rest/v1/media_assets")
      return json([])
    const name = url.pathname.split("/").at(-1),
      args = (request.postDataJSON() ?? {}) as Record<string, unknown>
    if (name === "social_profile")
      return json(
        args["p_username"] && args["p_username"] !== ownProfile["username"]
          ? [
              {
                ...ownProfile,
                id: author,
                username: "bori_family",
                display_name: "보리네",
                bio: "보리의 소개",
                version: null,
              },
            ]
          : [ownProfile],
      )
    if (name === "save_social_profile") {
      if (args["p_username"] === "reserved")
        return json({ code: "23505", message: "duplicate" }, 409)
      Object.assign(ownProfile, {
        username: args["p_username"],
        display_name: args["p_display_name"],
        bio: args["p_bio"],
        avatar_asset_id: args["p_avatar"],
        version: Number(ownProfile["version"]) + 1,
      })
      return json(null)
    }
    if (name === "cloud_version") return json(2)
    if (name === "own_story_assets") return json([])
    if (name === "save_private_post") {
      ownPosts.push({
        id: args["p_id"],
        owner_id: owner,
        pet_id: args["p_pet_id"],
        asset_id: args["p_asset_id"],
        content: args["p_content"],
        version: 1,
        visibility: "private",
      })
      return json(null)
    }
    if (
      name === "social_feed" &&
      ((args["p_following"] === true && !following) || args["p_author"] === owner)
    )
      return json([])
    if (name === "social_feed")
      return json([
        {
          id: post,
          owner_id: author,
          username: "bori_family",
          display_name: "보리네",
          pet_name: "보리",
          category: "DOG",
          asset_id: asset,
          content: "공개 산책 기록",
          created_at: new Date().toISOString(),
          likes: liked ? 1 : 0,
          comments: comments.length,
          liked,
          following,
        },
      ])
    if (name === "social_people")
      return json([{ id: author, username: "bori_family", display_name: "보리네", following }])
    if (name === "stories_feed")
      return json([
        ...ownStories,
        ...(following
          ? [
              {
                id: post,
                owner_id: author,
                username: "bori_family",
                display_name: "보리네",
                asset_id: asset,
                caption: "오늘의 보리",
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 3600000).toISOString(),
                viewed,
                views: null,
              },
            ]
          : []),
      ])
    if (name === "set_follow") following = args["p_follow"] === true
    if (name === "set_post_like") liked = args["p_liked"] === true
    if (name === "view_story") viewed = true
    if (name === "social_comments") return json(comments)
    if (name === "save_social_comment")
      comments.push({
        id: args["p_id"],
        owner_id: owner,
        username: "my_family",
        content: args["p_content"],
        created_at: new Date().toISOString(),
      })
    if (name === "delete_social_comment") comments.splice(0, comments.length)
    if (name === "reserve_media")
      return json({ id: asset, object_key: `${owner}/${asset}/original` })
    if (name === "create_story")
      ownStories.push({
        id: args["p_id"],
        owner_id: owner,
        username: "my_family",
        display_name: "나",
        asset_id: asset,
        caption: args["p_caption"],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        viewed: false,
        views: 0,
      })
    return json(null)
  })
  await page.addInitScript(
    ({ owner, language }) => {
      localStorage.setItem("i18nextLng", language)
      const exp = Math.floor(Date.now() / 1000) + 3600
      const token =
        btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) +
        "." +
        btoa(JSON.stringify({ sub: owner, exp, role: "authenticated", aud: "authenticated" })) +
        ".test"
      localStorage.setItem(
        "ilove-pets-auth",
        JSON.stringify({
          access_token: token,
          refresh_token: "test",
          token_type: "bearer",
          expires_at: exp,
          expires_in: 3600,
          user: {
            id: owner,
            aud: "authenticated",
            email: "test@example.invalid",
            email_confirmed_at: "2026-10-15",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-10-15",
          },
        }),
      )
    },
    { owner, language },
  )
  await page.setViewportSize({ width: 375, height: 812 })
  return png
}
