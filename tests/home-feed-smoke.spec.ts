import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

const viewportWidths = [375, 768, 1280]
const i18nextStorageKey = "i18nextLng"

interface CategoryMetrics {
  readonly buttonHeights: readonly number[]
  readonly documentOverflows: boolean
}

interface ShellMetrics {
  readonly appCanvasWidth: number
  readonly contentBottom: number
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

async function getCategoryMetrics(page: Page): Promise<CategoryMetrics> {
  return page.evaluate(() => ({
    buttonHeights: Array.from(
      document.querySelectorAll(".home-category-strip__button"),
      (button) => button.getBoundingClientRect().height,
    ),
    documentOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))
}

async function getShellMetrics(page: Page): Promise<ShellMetrics> {
  return page.evaluate(() => {
    const appCanvas = document.querySelector(".app-canvas")
    const content = document.querySelector(".home-feed .post-card:last-child")
    const navigation = document.querySelector(".bottom-navigation")
    const main = document.querySelector("main")

    if (
      !(appCanvas instanceof HTMLElement) ||
      !(content instanceof HTMLElement) ||
      !(navigation instanceof HTMLElement) ||
      !(main instanceof HTMLElement)
    ) {
      throw new Error(
        "Stage 5 shell requires app canvas, feed content, navigation, and main landmarks",
      )
    }

    return {
      appCanvasWidth: appCanvas.getBoundingClientRect().width,
      contentBottom: content.getBoundingClientRect().bottom,
      documentOverflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      mainBottom: main.getBoundingClientRect().bottom,
      navigationTop: navigation.getBoundingClientRect().top,
      navigationWidth: navigation.getBoundingClientRect().width,
    }
  })
}

async function expectVisibleBoriCard(page: Page): Promise<Locator> {
  const boriCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { level: 2, name: "Bori" }),
  })

  await expect(boriCard).toContainText("@mira")
  await expect(boriCard).toContainText("New ridge route approved by Bori.")
  await expect(boriCard).toContainText("#hike")
  await expect(boriCard).toContainText("#dog")
  await expect(boriCard).toContainText("#weekend")
  await expect(boriCard.getByRole("button", { name: /좋아요/ })).toBeVisible()
  await expect(boriCard.getByRole("button", { name: /댓글/ })).toBeVisible()
  await expect(boriCard.getByRole("button", { name: "공유" })).toBeVisible()

  return boriCard
}

test("renders Korean Stage 5 home feed acceptance at 375px", async ({ page }) => {
  // Given: the Korean production preview app opens on a compact mobile viewport.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the home feed is rendered from the production preview server.
  await page.goto("/")
  const categoryRegion = page.getByRole("region", { name: "반려동물 카테고리" })
  const feed = page.getByRole("feed", { name: "반려동물 피드" })
  const categoryMetrics = await getCategoryMetrics(page)

  // Then: the feed, categories, first post, and active Home nav are observable and touch-safe.
  await expect(page.getByRole("heading", { level: 1, name: "홈" })).toBeVisible()
  await expect(categoryRegion.getByRole("button")).toHaveCount(7)
  await expect(feed.getByRole("article")).toHaveCount(4)
  await expectVisibleBoriCard(page)
  await expect(page.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page")
  expect(categoryMetrics.documentOverflows).toBe(false)
  for (const buttonHeight of categoryMetrics.buttonHeights) {
    expect(buttonHeight).toBeGreaterThanOrEqual(44)
  }

  await page.screenshot({ path: "test-results/stage5-home-ko-375.png", fullPage: false })
})

test("filters Korean home feed by category", async ({ page }) => {
  // Given: the Korean home feed is open with all posts visible.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })
  await page.goto("/")
  const feed = page.getByRole("feed", { name: "반려동물 피드" })

  // When: the dog category is selected.
  await page.getByRole("button", { name: "강아지" }).click()

  // Then: only Bori's dog post remains in the feed.
  await expect(feed.getByRole("article")).toHaveCount(1)
  await expectVisibleBoriCard(page)

  // When: the cat category is selected.
  await page.getByRole("button", { name: "고양이" }).click()

  // Then: the localized empty state replaces article cards.
  await expect(feed.getByRole("article")).toHaveCount(0)
  await expect(feed).toContainText("이 카테고리에는 아직 게시물이 없습니다.")
})

test("renders Japanese category scroller without page overflow at 375px", async ({ page }) => {
  // Given: the detector cache contains Japanese before app boot.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ja-JP" })

  // When: the Japanese home feed opens on a compact viewport.
  await page.goto("/")
  const categoryRegion = page.getByRole("region", { name: "ペットカテゴリー" })
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  const shellMetrics = await getShellMetrics(page)

  // Then: labels stay in the internal category scroller and shell content avoids nav overlap.
  await expect(page.getByRole("heading", { level: 1, name: "ホーム" })).toBeVisible()
  await expect(categoryRegion).toContainText("すべて犬猫爬虫類鳥小動物その他")
  await expect(page.getByRole("feed", { name: "ペットフィード" }).getByRole("article")).toHaveCount(
    4,
  )
  expect(shellMetrics.documentOverflows).toBe(false)
  expect(shellMetrics.contentBottom).toBeLessThanOrEqual(shellMetrics.navigationTop)

  await page.screenshot({ path: "test-results/stage5-home-ja-375.png", fullPage: false })
})

test("falls back to English home labels for unsupported stored language", async ({ page }) => {
  // Given: the detector cache contains an unsupported language before app boot.
  await seedStorage(page, { key: i18nextStorageKey, value: "fr-FR" })

  // When: the home feed starts.
  await page.goto("/")

  // Then: English fallback labels are visible on the Home feed controls.
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible()
  await expect(page.getByRole("button", { exact: true, name: "All" })).toBeVisible()
  await expect(page.getByRole("button", { exact: true, name: "Dogs" })).toBeVisible()
})

for (const viewportWidth of viewportWidths) {
  test(`keeps Stage 5 home shell constrained at ${viewportWidth.toString()}px`, async ({
    page,
  }) => {
    // Given: a production preview viewport for Stage 5 home shell acceptance.
    await page.setViewportSize({ width: viewportWidth, height: 812 })
    await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

    // When: the home feed shell layout is measured.
    await page.goto("/")
    const shellMetrics = await getShellMetrics(page)

    // Then: app canvas and nav remain constrained to the mobile shell without page overflow.
    expect(shellMetrics.appCanvasWidth).toBeLessThanOrEqual(430)
    expect(shellMetrics.navigationWidth).toBeLessThanOrEqual(430)
    expect(shellMetrics.documentOverflows).toBe(false)
  })
}

test("keeps Stage 5 home feed usable with reduced motion", async ({ page }) => {
  // Given: the browser user prefers reduced motion.
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the home feed opens and a category filter is used.
  await page.goto("/")
  await page.getByRole("button", { name: "강아지" }).click()

  // Then: required controls and feed content remain visible and usable.
  await expect(page.getByRole("heading", { level: 1, name: "홈" })).toBeVisible()
  await expect(page.getByRole("region", { name: "반려동물 카테고리" })).toBeVisible()
  await expect(page.getByRole("feed", { name: "반려동물 피드" }).getByRole("article")).toHaveCount(
    1,
  )
  await expectVisibleBoriCard(page)
})
