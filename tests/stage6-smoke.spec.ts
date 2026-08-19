import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const viewportWidths = [375, 768, 1280]
const i18nextStorageKey = "i18nextLng"

interface ShellMetrics {
  readonly documentOverflows: boolean
  readonly mainBottom: number
  readonly navigationTop: number
  readonly navigationWidth: number
}

interface StorageSeed {
  readonly key: string
  readonly value: string
}

async function seedStorage(page: Page, seed: StorageSeed): Promise<void> {
  await page.addInitScript((storageSeed) => {
    window.localStorage.setItem(storageSeed.key, storageSeed.value)
  }, seed)
}

async function getShellMetrics(page: Page): Promise<ShellMetrics> {
  return page.evaluate(() => {
    const navigation = document.querySelector(".bottom-navigation")
    const main = document.querySelector("main")

    if (!(navigation instanceof HTMLElement) || !(main instanceof HTMLElement)) {
      throw new Error("Stage 6 shell requires navigation and main landmarks")
    }

    return {
      documentOverflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      mainBottom: main.getBoundingClientRect().bottom,
      navigationTop: navigation.getBoundingClientRect().top,
      navigationWidth: navigation.getBoundingClientRect().width,
    }
  })
}

async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
}

async function expectNoShellOverflow(page: Page): Promise<void> {
  await scrollToBottom(page)
  const metrics = await getShellMetrics(page)

  expect(metrics.documentOverflows).toBe(false)
  expect(metrics.navigationWidth).toBeLessThanOrEqual(430)
  expect(metrics.mainBottom).toBeLessThanOrEqual(metrics.navigationTop)
}

test("renders Korean Explore screen acceptance at 375px", async ({ page }) => {
  // Given: the Korean production preview app opens on a compact mobile viewport.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the Explore route is opened.
  await page.goto("/explore")

  // Then: search, category strip, and popular sections are observable and touch-safe.
  await expect(page.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible()
  await expect(page.getByRole("search", { name: "검색" })).toBeVisible()
  await expect(page.getByRole("region", { name: "동물 카테고리" }).getByRole("button")).toHaveCount(
    7,
  )
  await expect(page.getByRole("heading", { name: "인기 게시물" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "인기 펫" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Bori" })).toBeVisible()
  await expectNoShellOverflow(page)

  await page.screenshot({ path: "test-results/stage6-explore-ko-375.png", fullPage: false })
})

test("renders Korean Create screen acceptance at 375px", async ({ page }) => {
  // Given: the Korean production preview app opens on a compact mobile viewport.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the Create route is opened.
  await page.goto("/create")

  // Then: photo picker, pet selector, content, tags, and submit are observable.
  await expect(page.getByRole("heading", { level: 1, name: "작성" })).toBeVisible()
  await expect(page.getByRole("button", { name: "사진 추가" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: "펫" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "내용" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "태그" })).toBeVisible()
  await expect(page.getByRole("button", { name: "게시" })).toBeVisible()
  await expectNoShellOverflow(page)

  await page.screenshot({ path: "test-results/stage6-create-ko-375.png", fullPage: false })
})

test("renders Korean Activity screen acceptance at 375px", async ({ page }) => {
  // Given: the Korean production preview app opens on a compact mobile viewport.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the Activity route is opened.
  await page.goto("/activity")

  // Then: all three mock notifications render newest first without shell overflow.
  await expect(page.getByRole("heading", { level: 1, name: "활동" })).toBeVisible()
  await expect(page.getByRole("list", { name: "알림" }).getByRole("listitem")).toHaveCount(3)
  await expect(page.getByText(/Arden Lee님이 팔로우하기 시작했습니다/)).toBeVisible()
  await expect(page.getByText('"That color is perfect."')).toBeVisible()
  await expectNoShellOverflow(page)

  await page.screenshot({ path: "test-results/stage6-activity-ko-375.png", fullPage: false })
})

test("renders Korean My screen acceptance at 375px", async ({ page }) => {
  // Given: the Korean production preview app opens on a compact mobile viewport.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the My route is opened.
  await page.goto("/my")

  // Then: profile, stats, registered pets, post grid, and settings link are observable.
  await expect(page.getByRole("heading", { level: 1, name: "마이" })).toBeVisible()
  await expect(page.getByRole("link", { name: "설정" })).toHaveAttribute("href", "/settings")
  await expect(page.getByRole("heading", { name: "Mira Han" })).toBeVisible()
  await expect(page.getByText("게시물 2개")).toBeVisible()
  await expect(page.getByRole("heading", { name: "등록 펫" })).toBeVisible()
  await expect(page.getByRole("region", { name: "내 게시물" })).toBeVisible()
  await expectNoShellOverflow(page)

  await page.screenshot({ path: "test-results/stage6-my-ko-375.png", fullPage: false })
})

test("renders Korean Settings screen acceptance at 375px", async ({ page }) => {
  // Given: the Korean production preview app opens on a compact mobile viewport.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the Settings route is opened from the My screen.
  await page.goto("/settings")

  // Then: back link, sections, controls, and account actions are observable.
  const settingsRegion = page.getByRole("region", { name: "설정" })
  await expect(page.getByRole("link", { name: "뒤로" })).toHaveAttribute("href", "/my")
  await expect(page.getByRole("heading", { level: 1, name: "설정" })).toBeVisible()
  await expect(settingsRegion.getByRole("heading", { name: "계정" })).toBeVisible()
  await expect(settingsRegion.getByRole("heading", { name: "화면 및 언어" })).toBeVisible()
  await expect(settingsRegion.getByRole("group", { name: "테마 설정" })).toBeVisible()
  await expect(settingsRegion.getByRole("button", { name: "한국어" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(settingsRegion.getByRole("button", { name: "로그아웃" })).toBeVisible()
  await expect(settingsRegion.getByRole("button", { name: "계정 삭제" })).toBeVisible()
  await expect(settingsRegion.getByText("지금은 UI만 제공됩니다.")).toBeVisible()
  await expectNoShellOverflow(page)

  await page.screenshot({ path: "test-results/stage6-settings-ko-375.png", fullPage: false })
})

for (const viewportWidth of viewportWidths) {
  test(`keeps Stage 6 screens constrained at ${viewportWidth.toString()}px`, async ({ page }) => {
    // Given: a production preview viewport for Stage 6 shell acceptance.
    await page.setViewportSize({ width: viewportWidth, height: 812 })
    await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

    // When: every Stage 6 route is opened.
    for (const path of ["/explore", "/create", "/activity", "/my", "/settings"]) {
      await page.goto(path)
      await scrollToBottom(page)

      // Then: the shell stays constrained without page overflow.
      const metrics = await getShellMetrics(page)
      expect(metrics.documentOverflows).toBe(false)
      expect(metrics.navigationWidth).toBeLessThanOrEqual(430)
      expect(metrics.mainBottom).toBeLessThanOrEqual(metrics.navigationTop)
    }
  })
}