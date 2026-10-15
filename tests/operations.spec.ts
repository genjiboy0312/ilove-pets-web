import { expect, test } from "@playwright/test"
import type { Route } from "@playwright/test"
import { setup, owner, author, post, asset } from "./support/social-fixture"
function reply(route: Route, body: unknown, status = 200) {
  if (route.request().method() === "OPTIONS") return route.fallback()
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  })
}

test("settings require explicit deletion confirmation and recover from recent-auth errors", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  await page.route("**/rest/v1/rpc/blocked_users", (route) =>
    reply(route, [{ id: author, username: "bori_family", display_name: "보리네" }]),
  )
  let deletes = 0
  await page.route("**/functions/v1/account-operations", (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback()
    deletes++
    return reply(route, { error: "reauthentication_required" }, 403)
  })
  await page.goto("/settings")
  await page.getByText("차단한 사용자", { exact: true }).click()
  await expect(page.getByRole("button", { name: "차단 해제" })).toBeVisible()
  await page.getByRole("button", { name: "계정 삭제", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "계정 삭제", exact: true })
  const submit = dialog.getByRole("button", { name: "계정 삭제 요청", exact: true })
  await expect(submit).toBeDisabled()
  await dialog.getByRole("checkbox").check()
  await dialog.getByLabel("확인을 위해 DELETE 입력").fill("WRONG")
  await expect(submit).toBeDisabled()
  expect(deletes).toBe(0)
  await dialog.getByLabel("확인을 위해 DELETE 입력").fill("DELETE")
  await submit.click()
  await expect(dialog.getByRole("alert")).toContainText("최근 10분")
  await expect(dialog.getByRole("link", { name: "다시 로그인" })).toHaveAttribute("href", "/auth")
  await expect(dialog.getByRole("button", { name: "내 클라우드 기록 백업" })).toBeVisible()
  expect(deletes).toBe(1)
  await page.screenshot({ path: "test-results/s5-delete-confirm.png", fullPage: false })
})

test("report is acknowledged only on success; blocking requires a second confirmation", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  let blocks = 0,
    reports = 0
  await page.route("**/rest/v1/rpc/report_content", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback()
    const body = route.request().postDataJSON() as Record<string, unknown>
    expect(body["p_target"]).toBe(post)
    expect(body["p_kind"]).toBe("post")
    reports++
    await reply(route, "report-id")
  })
  await page.route("**/rest/v1/rpc/set_user_block", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback()
    expect(route.request().postDataJSON()).toEqual({ p_target: author, p_block: true })
    blocks++
    await reply(route, null)
  })
  await page.goto("/posts/" + post)
  const actions = page.locator(".social-card > .safety-actions")
  await actions.locator("summary").click()
  await actions.getByLabel("신고 사유").selectOption("privacy")
  await actions.getByLabel("추가 설명 (선택)").fill("테스트 신고")
  await actions.getByRole("button", { name: "신고 접수", exact: true }).click()
  await expect(actions.getByRole("status")).toContainText("운영자가 검토")
  expect(reports).toBe(1)
  await actions.getByRole("button", { name: "이 사용자 차단", exact: true }).click()
  expect(blocks).toBe(0)
  await expect(actions.getByText(/서로의 팔로우가 해제/)).toBeVisible()
  await page.screenshot({ path: "test-results/s5-report-block.png", fullPage: false })
  await actions.getByRole("button", { name: "내용을 확인하고 차단" }).click()
  await expect.poll(() => blocks).toBe(1)
})

test("cloud record export downloads a device-restorable backup without signed URLs", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  const png = await setup(page)
  await page.route("**/rest/v1/rpc/blocked_users", (route) => reply(route, []))
  await page.route("**/rest/v1/pets?*", (route) =>
    reply(route, [
      {
        id: owner,
        owner_id: owner,
        name: "구름이",
        breed: "Mix",
        category: "CAT",
        version: 1,
        created_at: "2026-10-15T01:00:00+00:00",
      },
    ]),
  )
  await page.route("**/rest/v1/posts?*", (route) =>
    reply(route, [
      {
        id: post,
        owner_id: owner,
        pet_id: owner,
        asset_id: asset,
        status: "published",
        deleted_at: null,
        content: "Cloud photo",
        tags: ["daily"],
        created_at: "2026-10-15T02:00:00+00:00",
        source_created_at: null,
      },
    ]),
  )
  await page.route("**/rest/v1/media_assets?*", (route) =>
    reply(route, [
      {
        id: asset,
        owner_id: owner,
        status: "ready",
        display_key: owner + "/" + asset + "/display.webp",
      },
    ]),
  )
  await page.route("**/storage/v1/object/sign/**", (route) => {
    if (route.request().method() === "OPTIONS") return route.fallback()
    if (route.request().method() === "POST")
      return reply(route, { signedURL: "/object/sign/pet-media/export.png?token=test" })
    return route.fulfill({
      contentType: "image/png",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: png,
    })
  })
  await page.goto("/settings")
  await page.getByRole("button", { name: "계정 삭제", exact: true }).click()
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "내 클라우드 기록 백업" }).click()
  const file = await download,
    path = await file.path()
  expect(path).toBeTruthy()
  const { readFile } = await import("node:fs/promises")
  const content = await readFile(path, "utf8")
  const backup: unknown = JSON.parse(content)
  expect(backup).toMatchObject({
    format: "ilove-pets-backup",
    metadata: {
      pets: [{ name: "구름이", createdAt: "2026-10-15T01:00:00.000Z" }],
      posts: [{ content: "Cloud photo" }],
    },
    photos: [{ data: "data:image/png;base64," + png.toString("base64") }],
  })
  expect(content).not.toContain("access_token")
  expect(content).not.toContain("signedUrl")
})

test("failed lazy chunks leave a recovery message and usable home navigation", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
  })
  await page.route("**/assets/SettingsRoute-*.js", (route) => route.abort("failed"))
  await page.goto("/settings")
  await expect(page.getByRole("alert")).toContainText("화면을 불러오지 못했습니다")
  await page.getByRole("alert").getByRole("link", { name: "홈", exact: true }).click()
  await expect(page.getByRole("heading", { name: "홈", exact: true })).toBeVisible()
})

for (const language of ["ko", "en", "ja"])
  test(`S5 account and report forms fit ${language} light/dark and device sizes`, async ({
    page,
  }, info) => {
    test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
    await setup(page, language)
    await page.route("**/rest/v1/rpc/blocked_users", (route) => reply(route, []))
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme })
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 812 })
        await page.goto("/settings")
        await page.locator(".account-safety > button").click()
        const form = page.locator(".account-deletion-form")
        await expect(form).toBeVisible()
        await form.locator("button[type=submit]").scrollIntoViewIfNeeded()
        await expect(form.locator("button[type=submit]")).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        if (language === "ko" && theme === "light" && width === 375) {
          await page.locator(".settings-sheet__body").evaluate((element) => {
            element.scrollTop = 0
          })
          await page.screenshot({
            path: "test-results/s5-delete-layout.png",
            animations: "disabled",
          })
        }
        await page.goto("/posts/" + post)
        const actions = page.locator(".social-card > .safety-actions")
        await actions.locator("summary").click()
        await expect(actions.locator("textarea")).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
    }
  })
