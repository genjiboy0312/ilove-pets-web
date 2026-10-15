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

test("cloud My edits profile/photo, links to public profile and creates a private cloud post", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  const png = await setup(page)
  await page.goto("/myaccount")
  expect(
    (await page.getByRole("group", { name: "저장 위치" }).boundingBox())?.width,
  ).toBeGreaterThan(300)
  await expect(
    page
      .getByRole("group", { name: "저장 위치" })
      .getByRole("button", { name: "클라우드", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "우리집", exact: true })).toBeVisible()
  await page.getByText("프로필 수정", { exact: true }).click()
  await page.getByLabel("사용자 이름", { exact: true }).fill("reserved")
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "이미 사용 중" })).toBeVisible()
  await page.getByLabel("사용자 이름", { exact: true }).fill("new_family")
  await page.getByLabel("닉네임", { exact: true }).fill("새로운 가족")
  await page.getByLabel("소개", { exact: true }).fill("공개 소개")
  await page
    .getByLabel("프로필 사진", { exact: true })
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png })
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click()
  await expect(page.getByText("프로필을 저장했습니다.", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "새로운 가족", exact: true })).toBeVisible()
  await page.getByRole("link", { name: "내 공개 프로필 보기", exact: true }).click()
  await expect(page).toHaveURL(/\/users\/new_family$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "계정 프로필", exact: true }),
  ).toBeVisible()
  await expect(
    page
      .getByRole("region", { name: "계정 프로필", exact: true })
      .getByText("공개 소개", { exact: true }),
  ).toBeVisible()
  await expect(page.locator(".account-profile__avatar img")).toBeVisible()
  await page.goto("/create?destination=cloud")
  await expect(
    page.getByRole("heading", { name: "클라우드 게시글 작성", exact: true }),
  ).toBeVisible()
  await page.getByLabel("게시물 본문").fill("새 클라우드 글")
  await page
    .getByLabel("사진 (JPEG/PNG/WebP, 5 MiB 이하)")
    .setInputFiles({ name: "post.png", mimeType: "image/png", buffer: png })
  await page.getByRole("button", { name: "클라우드에 저장", exact: true }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "저장 후 서버 데이터를 갱신했습니다." }),
  ).toBeVisible()
  await page.goto("/myaccount")
  await page.locator("summary").filter({ hasText: "게시물 · 펫 · 성장 기록" }).click()
  await expect(page.getByText("새 클라우드 글", { exact: true })).toBeVisible()
  await expect(
    page.locator(".social-publish p").filter({ hasText: /^비공개 게시물$/ }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "test-results/account-cloud-mobile.png", fullPage: true })
})
test("following feed choice survives navigation and reload; swipe changes story", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  await page.goto("/")
  await page.getByRole("button", { name: "공개 피드", exact: true }).click()
  await page.getByRole("button", { name: "팔로잉 피드", exact: true }).click()
  await expect(page.locator(".social-card")).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole("button", { name: "공개 피드", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByRole("button", { name: "팔로잉 피드", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.locator(".social-card").getByRole("button", { name: "팔로잉", exact: true }).click()
  await expect(
    page.getByText("팔로우한 계정의 공개 글이 없습니다. 전체 피드에서 친구를 찾아보세요."),
  ).toBeVisible()
  await page.getByRole("button", { name: "전체", exact: true }).click()
  await page.locator(".social-card").getByRole("button", { name: "팔로우", exact: true }).click()
  await page
    .getByRole("region", { name: "팔로우한 사람들의 스토리" })
    .getByRole("button", { name: "보리네", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toBeVisible()
  const photo = page.locator(".story-photo")
  const box = await photo.boundingBox()
  if (!box) throw new Error("story photo missing")
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("story image failures offer a working retry", async ({ page }, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  await page.goto("/")
  const rail = page.getByRole("region", { name: "팔로우한 사람들의 스토리" })
  await expect(rail.locator("img")).toBeVisible()
  await page.route(
    "**/functions/v1/social-media?asset=*",
    (route) => route.fulfill({ status: 503, headers: { "Access-Control-Allow-Origin": "*" } }),
    { times: 1 },
  )
  await rail.getByRole("button", { name: "보리네", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "사진 다시 불러오기", exact: true }).click()
  await expect(dialog.locator(".story-photo img")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
})
