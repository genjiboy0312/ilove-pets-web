import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
  })
})

test("auth keeps local navigation usable on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/auth")
  await expect(page.getByRole("heading", { name: "로그인 · 회원가입" })).toBeVisible()
  if (testInfo.project.metadata["authConfigured"] === true) {
    await expect(page.getByLabel("이메일", { exact: true })).toBeEnabled()
    await expect(page.getByRole("button", { name: "Google로 계속" })).toBeEnabled()
  } else {
    await expect(page.getByRole("button", { name: "Google로 계속" })).toBeDisabled()
    await expect(
      page.getByText("클라우드 로그인을 준비 중입니다. 로컬 기능은 계속 사용할 수 있습니다."),
    ).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole("link", { name: "내 계정으로 돌아가기" }).click()
  await expect(page).toHaveURL(/\/myaccount$/)
})

test("invalid callbacks clear tokens and are excluded from the PWA cache", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.goto("/auth/callback?code=expired-test-code&error=denied")
  await expect(page.getByRole("alert")).toContainText("인증 링크를 확인하지 못했습니다")
  await expect(page).toHaveURL(/\/auth\/callback$/)
  const cachedAuthUrls = await page.evaluate(async () => {
    const all = await Promise.all(
      (await caches.keys()).map(async (name) =>
        (await (await caches.open(name)).keys()).map((request) => request.url),
      ),
    )
    return all
      .flat()
      .filter(
        (url) => new URL(url).pathname.startsWith("/auth") || new URL(url).searchParams.has("code"),
      )
  })
  expect(cachedAuthUrls).toEqual([])
})
