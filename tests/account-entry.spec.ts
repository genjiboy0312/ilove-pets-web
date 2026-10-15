import { expect, test } from "@playwright/test"

test("guest account entry preserves records and explicitly opens device management", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
  })
  await page.goto("/myaccount")
  await expect(page.getByRole("heading", { name: "우리 아이의 기록을 한곳에" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "내 펫 등록" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Google로 계속" })).toBeVisible()
  await expect(page.getByRole("link", { name: "이메일로 로그인" })).toHaveAttribute("href", "/auth")
  await page.getByRole("button", { name: "로그인 없이 기기 기록 사용하기" }).click()
  await page.getByLabel("펫 이름", { exact: true }).fill("Entry Pet")
  await page.getByLabel("품종", { exact: true }).fill("Mix")
  await page.getByRole("button", { name: "펫 저장", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Entry Pet", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "로그인 안내로 돌아가기" }).click()
  await expect(page.getByText("이 기기에 저장된 기록은 그대로 보관되어 있어요.")).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: "내 펫 등록" })).toHaveCount(0)
  await page.getByRole("button", { name: "로그인 없이 기기 기록 사용하기" }).click()
  await expect(page.getByRole("heading", { name: "Entry Pet", exact: true })).toBeVisible()
})

test("unified category strip supports keyboard and scrolling without separate arrows", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  const strip = page.locator(".home-category-strip")
  await expect(strip.getByRole("button")).toHaveCount(7)
  await strip.getByRole("button", { name: "전체", exact: true }).focus()
  await page.keyboard.press("End")
  await expect(strip.getByRole("button", { name: "기타", exact: true })).toBeFocused()
  await expect
    .poll(() => strip.locator(".home-category-strip__scroller").evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  await page.keyboard.press("Enter")
  await expect(strip.getByRole("button", { name: "기타", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.keyboard.press("Home")
  await expect(strip.getByRole("button", { name: "전체", exact: true })).toBeFocused()
  await expect(strip.locator(".home-category-strip__arrow")).toHaveCount(0)
})

for (const language of ["ko", "en", "ja"])
  test(`account and categories fit ${language} in light/dark`, async ({ page }) => {
    await page.addInitScript((lang) => {
      localStorage.setItem("i18nextLng", lang)
    }, language)
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme })
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 812 })
        for (const path of ["/myaccount", "/"]) {
          await page.goto(path)
          await expect(page.locator("h1")).toBeVisible()
          if (path === "/myaccount") {
            await expect(page.locator(".account-welcome")).toBeVisible()
            await expect
              .poll(() =>
                page
                  .locator(".account-welcome__illustration")
                  .evaluate(
                    (el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0,
                  ),
              )
              .toBe(true)
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true)
          if (language === "ko" && width === 375)
            await page.screenshot({
              path: `test-results/entry-${path === "/" ? "home" : "account"}-${theme}.png`,
              animations: "disabled",
            })
        }
      }
    }
  })
