import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
const owner = "00000000-0000-0000-0000-000000000002",
  author = "00000000-0000-0000-0000-000000000001",
  post = "10000000-0000-0000-0000-000000000001",
  asset = "20000000-0000-0000-0000-000000000001"
async function setup(page: Page) {
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
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    const json = (body: unknown) =>
      route.fulfill({
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
    const name = url.pathname.split("/").at(-1),
      args = (request.postDataJSON() ?? {}) as Record<string, unknown>
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
    ({ owner }) => {
      localStorage.setItem("i18nextLng", "ko")
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
    { owner },
  )
  await page.setViewportSize({ width: 375, height: 812 })
  return png
}
test("stories open, pause, close with keyboard, publish and disappear after unfollow", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  const png = await setup(page)
  await page.goto("/")
  const rail = page.getByRole("region", { name: "팔로우한 사람들의 스토리" })
  await rail.getByRole("button", { name: "보리네", exact: true }).click()
  const viewer = page.getByRole("dialog")
  await expect(viewer.getByText("오늘의 보리")).toBeVisible()
  await viewer.getByRole("button", { name: "일시 정지", exact: true }).click()
  await expect(viewer.getByRole("button", { name: "재생", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(viewer).toHaveCount(0)
  await rail.getByRole("button", { name: "스토리 추가", exact: true }).click()
  const composer = page.getByRole("dialog")
  await composer
    .getByLabel("사진", { exact: true })
    .setInputFiles({ name: "story.png", mimeType: "image/png", buffer: png })
  await composer.getByLabel("스토리 설명").fill("나의 첫 스토리")
  await composer.getByRole("button", { name: "스토리 올리기", exact: true }).click()
  await expect(composer).toHaveCount(0)
  await expect(rail.getByRole("button", { name: "내 스토리", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "공개 피드", exact: true }).click()
  await page.locator(".social-card").getByRole("button", { name: "팔로잉", exact: true }).click()
  await expect(rail.getByRole("button", { name: "보리네", exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: "test-results/social-stories-mobile.png", fullPage: true })
})
test("public detail supports server likes, comments and own comment deletion", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  await page.goto("/posts/" + post)
  await expect(page.getByText("공개 산책 기록")).toBeVisible()
  await page.getByRole("button", { name: "좋아요", exact: true }).click()
  await expect(page.getByRole("button", { name: "좋아요 취소", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.getByLabel("댓글 내용").fill("산책 즐거워 보여요")
  await page.getByRole("button", { name: "등록", exact: true }).click()
  await expect(page.getByText("산책 즐거워 보여요")).toBeVisible()
  await page.getByRole("button", { name: "삭제", exact: true }).click()
  await expect(page.getByText("산책 즐거워 보여요")).toHaveCount(0)
})
