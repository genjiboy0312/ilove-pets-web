import { expect, test } from "@playwright/test"
import type { Route } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { setup, owner } from "./support/social-fixture"

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  })

test("new cloud account shows loading, empty records, registration and enabled writing", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  const pets: Record<string, unknown>[] = []
  let release: () => void = () => undefined
  const loading = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/rest/v1/pets?*", async (route) => {
    await loading
    return json(route, pets)
  })
  await page.route("**/rest/v1/rpc/save_pet", (route) => {
    const args = route.request().postDataJSON() as Record<string, unknown>
    pets.push({
      id: args["p_id"],
      owner_id: owner,
      name: args["p_name"],
      breed: args["p_breed"],
      category: args["p_category"],
      version: 1,
    })
    return json(route, null)
  })
  await page.goto("/cloud")
  await expect(page.getByRole("status")).toContainText("불러오는 중")
  await expect(page.getByLabel("펫 이름", { exact: true })).toHaveCount(0)
  release()
  await expect(page.getByText("아직 기록이 없습니다.", { exact: true }).first()).toBeVisible()
  await expect(page.getByLabel("게시물 본문")).toHaveCount(0)
  await expect(page.getByText("먼저 클라우드 펫을 등록하세요.", { exact: true })).toBeVisible()
  await expect(page.getByLabel("펫 이름", { exact: true })).toBeEnabled()
  await mkdir("docs/screenshots", { recursive: true })
  await page.screenshot({ path: "docs/screenshots/account-new-cloud.png" })
  await page.getByLabel("펫 이름", { exact: true }).fill("첫 반려동물")
  await page.getByLabel("품종", { exact: true }).fill("믹스")
  await page
    .locator(".cloud-section")
    .first()
    .getByRole("button", { name: "클라우드에 저장", exact: true })
    .click()
  await expect(page.getByRole("status")).toContainText("저장 후 서버 데이터")
  await expect(page.getByLabel("게시물 본문")).toBeEnabled()
  expect(pets).toHaveLength(1)
  await page.reload()
  await expect(page.getByText("첫 반려동물", { exact: true }).first()).toBeVisible()
})

test("failed initial request offers explicit refresh and recovers without duplicate writes", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  let failed = true
  await page.route("**/rest/v1/pets?*", (route) =>
    failed ? json(route, { code: "XX000", message: "temporary failure" }, 503) : json(route, []),
  )
  await page.goto("/cloud")
  await expect(page.getByRole("alert")).toContainText("새로고침 후 다시 시도", { timeout: 20000 })
  await expect(page.getByLabel("펫 이름", { exact: true })).toHaveCount(0)
  await page.screenshot({ path: "docs/screenshots/cloud-retry.png" })
  failed = false
  await page.getByRole("button", { name: "서버에서 새로고침", exact: true }).click()
  await expect(page.getByLabel("펫 이름", { exact: true })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
})

for (const width of [360, 390, 430]) {
  test(`new account forms fit touch viewport ${width.toString()} in both themes`, async ({
    page,
  }, info) => {
    test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
    await setup(page)
    await page.setViewportSize({ width, height: 844 })
    await page.route("**/rest/v1/pets?*", (route) => json(route, []))
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme })
      for (const path of ["/cloud", "/create?destination=cloud", "/myaccount"]) {
        await page.goto(path)
        await expect(page.locator("h1")).toBeVisible()
        if (path === "/cloud")
          await expect(page.getByLabel("펫 이름", { exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        for (const input of await page
          .locator("input:visible, textarea:visible, select:visible")
          .all()) {
          expect(
            await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
          ).toBeGreaterThanOrEqual(16)
        }
      }
    }
  })
}
