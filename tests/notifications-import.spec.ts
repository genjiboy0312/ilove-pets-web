import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
const owner = "00000000-0000-0000-0000-000000000002"
const post = "10000000-0000-0000-0000-000000000001"
async function seed(page: Page) {
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
}

async function mock(page: Page) {
  const items: Record<string, unknown>[] = []
  const completed = new Set<string>()
  let postFailure = true,
    uploads = 0
  const notifications = Array.from({ length: 31 }, (_, i) => ({
    id: `notice-${String(i)}`,
    kind: i === 0 ? "comment" : "like",
    actor_name: "테스트 가족",
    actor_username: null,
    post_id: post,
    created_at: new Date(Date.now() - i * 1000).toISOString(),
    read_at: null as string | null,
  }))
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    if (req.method() === "OPTIONS")
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
    if (url.pathname === "/functions/v1/cloud-media") return json({ ready: true })
    if (url.pathname.startsWith("/storage/v1/object/")) {
      uploads++
      return json({ Key: "uploaded" })
    }
    if (url.pathname === "/rest/v1/media_assets" && url.searchParams.get("select") === "status")
      return json({ status: "ready" })
    if (
      [
        "/rest/v1/pets",
        "/rest/v1/posts",
        "/rest/v1/growth_records",
        "/rest/v1/media_assets",
      ].includes(url.pathname)
    )
      return json([])
    const name = url.pathname.split("/").at(-1),
      args = (req.postDataJSON() ?? {}) as Record<string, unknown>
    if (name === "cloud_version") return json(2)
    if (name === "own_story_assets" || name === "social_feed" || name === "stories_feed")
      return json([])
    if (name === "local_import_history") return json(items)
    if (name === "notifications_unread") return json(notifications.filter((n) => !n.read_at).length)
    if (name === "notifications_feed")
      return json(
        notifications
          .filter(
            (n) =>
              !args["p_before"] ||
              n.created_at < (typeof args["p_before"] === "string" ? args["p_before"] : ""),
          )
          .slice(0, 30),
      )
    if (name === "read_all_notifications") {
      for (const n of notifications) n.read_at = new Date().toISOString()
      return json(null)
    }
    if (name === "read_notification") {
      const n = notifications.find((n) => n.id === args["p_id"])
      if (n) n.read_at = new Date().toISOString()
      return json(null)
    }
    if (name === "prepare_local_import") {
      let item = items.find(
        (i) => i["kind"] === args["p_kind"] && i["source_id"] === args["p_source"],
      )
      if (!item) {
        item = {
          id: crypto.randomUUID(),
          target_id: crypto.randomUUID(),
          kind: args["p_kind"],
          source_id: args["p_source"],
          payload: args["p_payload"],
          asset_id: null,
          completed_at: null,
        }
        items.push(item)
      }
      return json(item)
    }
    if (name === "reserve_media") {
      const id = crypto.randomUUID()
      return json({ id, object_key: `${owner}/${id}/original` })
    }
    if (name === "attach_local_import_media") {
      const i = items.find((i) => i["id"] === args["p_id"])
      if (i) i["asset_id"] = args["p_asset"]
      return json(null)
    }
    if (name === "finish_local_import") {
      const i = items.find((i) => i["id"] === args["p_id"])
      if (i?.["kind"] === "post" && postFailure) {
        postFailure = false
        return json({ code: "XX000", message: "temporary" }, 503)
      }
      if (i) {
        i["completed_at"] = new Date().toISOString()
        completed.add(String(i["id"]))
      }
      return json(null)
    }
    return json(null)
  })
  return { items, completed, uploads: () => uploads }
}
test("real notification UI paginates, marks read and closes header sheet on opening target", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await seed(page)
  await mock(page)
  await page.goto("/")
  await expect(page.getByLabel("읽지 않은 알림 31개")).toBeVisible()
  await page.getByRole("button", { name: "활동", exact: true }).click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.locator(".notification-list>li")).toHaveCount(30)
  await sheet.getByRole("button", { name: "더 보기", exact: true }).click()
  await expect(sheet.locator(".notification-list>li")).toHaveCount(31)
  await sheet.getByRole("button", { name: "모두 읽음" }).click()
  await expect(page.locator(".notification-badge")).toHaveCount(0)
  await sheet.getByRole("button", { name: "확인하기", exact: true }).first().click()
  await expect(page).toHaveURL(new RegExp("/posts/" + post + "$"))
  await expect(sheet).toHaveCount(0)
})

test("backup import previews privately, retries only failed items and retains local originals", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await seed(page)
  const state = await mock(page)
  await page.goto("/myaccount/import")
  const base64 = await page.evaluate(() => {
    const c = document.createElement("canvas")
    c.width = 32
    c.height = 24
    return c.toDataURL("image/png")
  })
  const metadata = {
    schemaVersion: 1,
    pets: [
      {
        id: "pet_local_one",
        name: "복사할 펫",
        category: "CAT",
        breed: "Mix",
        createdAt: "2026-10-01T00:00:00.000Z",
        growth: [{ id: "growth1", date: "2026-10-01", weightKg: 3, note: "성장 메모" }],
      },
    ],
    posts: [
      {
        id: "post_local_one",
        petId: "pet_local_one",
        photoKey: "photo-one",
        content: "이전할 사진 게시물",
        tags: ["pet"],
        createdAt: "2026-10-02T00:00:00.000Z",
        comments: [
          { id: "note1", content: "비공개 댓글 메모", createdAt: "2026-10-03T00:00:00.000Z" },
        ],
      },
    ],
  }
  const original = JSON.stringify(metadata)
  await page.evaluate((value) => {
    localStorage.setItem("ilove-pets-web:local-content:v1", value)
  }, original)
  const backup = Buffer.from(
    JSON.stringify({
      format: "ilove-pets-backup",
      version: 1,
      metadata,
      photos: [{ key: "photo-one", data: base64 }],
    }),
  )
  await page
    .getByLabel("백업 파일 미리보기")
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup })
  await expect(
    page.getByText("펫 1 · 게시물 1 · 성장 기록 1 · 사진 1", { exact: true }),
  ).toBeVisible()
  expect(state.items.length).toBe(0)
  const start = page.getByRole("button", { name: "이전 시작 / 재시도" })
  await expect(start).toBeDisabled()
  await page.getByRole("checkbox").check()
  await start.click()
  await expect(start).toBeEnabled()
  await expect(page.getByText(/실패 · 재시도 가능/)).toBeVisible()
  expect(state.completed.size).toBe(2)
  expect(state.uploads()).toBe(1)
  await start.click()
  await expect(start).toBeEnabled()
  expect(state.completed.size).toBe(3)
  expect(state.items.length).toBe(3)
  expect(state.uploads()).toBe(1)
  await expect(page.getByText("이전 완료 · 중복 없음", { exact: true })).toHaveCount(3)
  expect(await page.evaluate(() => localStorage.getItem("ilove-pets-web:local-content:v1"))).toBe(
    original,
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "test-results/import-mobile.png", fullPage: true })
})
