import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const viewportWidths = [375, 768, 1280]
const minimumTextContrastRatio = 4.5
const i18nextStorageKey = "i18nextLng"

interface RgbColor {
  readonly red: number
  readonly green: number
  readonly blue: number
}

interface ActiveLinkColors {
  readonly color: string
  readonly backgroundColor: string
}

interface NavigationMetrics {
  readonly documentOverflows: boolean
  readonly linkTargets: readonly LinkTarget[]
  readonly mainBottom: number
  readonly navigationCenter: number
  readonly navigationTop: number
  readonly navigationWidth: number
  readonly viewportCenter: number
}

interface LinkTarget {
  readonly width: number
  readonly height: number
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

function parseRgbColor(color: string): RgbColor {
  const colorMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color)
  const redValue = colorMatch?.at(1)
  const greenValue = colorMatch?.at(2)
  const blueValue = colorMatch?.at(3)

  if (redValue === undefined || greenValue === undefined || blueValue === undefined) {
    throw new Error(`Unsupported CSS color format: ${color}`)
  }

  return {
    red: Number.parseInt(redValue, 10),
    green: Number.parseInt(greenValue, 10),
    blue: Number.parseInt(blueValue, 10),
  }
}

function getRelativeLuminance(color: RgbColor): number {
  const channels = [color.red, color.green, color.blue].map((channel) => {
    const normalizedChannel = channel / 255

    return normalizedChannel <= 0.03928
      ? normalizedChannel / 12.92
      : ((normalizedChannel + 0.055) / 1.055) ** 2.4
  })
  const red = channels.at(0)
  const green = channels.at(1)
  const blue = channels.at(2)

  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error("RGB luminance requires three color channels")
  }

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function getContrastRatio(foreground: RgbColor, background: RgbColor): number {
  const foregroundLuminance = getRelativeLuminance(foreground)
  const backgroundLuminance = getRelativeLuminance(background)
  const lighterLuminance = Math.max(foregroundLuminance, backgroundLuminance)
  const darkerLuminance = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighterLuminance + 0.05) / (darkerLuminance + 0.05)
}

async function getNavigationMetrics(page: Page): Promise<NavigationMetrics> {
  return page.evaluate(() => {
    const navigation = document.querySelector(".bottom-navigation")
    const main = document.querySelector("main")
    const links = Array.from(document.querySelectorAll(".bottom-navigation__link"))

    if (!(navigation instanceof HTMLElement) || !(main instanceof HTMLElement)) {
      throw new Error("Stage 4 shell requires navigation and main landmarks")
    }

    const navigationRect = navigation.getBoundingClientRect()
    const mainRect = main.getBoundingClientRect()

    return {
      documentOverflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      linkTargets: links.map((link) => {
        const rect = link.getBoundingClientRect()

        return { width: rect.width, height: rect.height }
      }),
      mainBottom: mainRect.bottom,
      navigationTop: navigationRect.top,
      navigationWidth: navigationRect.width,
      viewportCenter: document.documentElement.clientWidth / 2,
      navigationCenter: navigationRect.left + navigationRect.width / 2,
    }
  })
}

test("clicking bottom navigation routes updates URL, heading, and active state", async ({
  page,
}) => {
  // Given: the Korean production preview app is open on home.
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })
  await page.goto("/")

  // When: each fixed bottom navigation item is clicked.
  const routeChecks = [
    { heading: "탐색", label: "탐색", path: "/explore" },
    { heading: "작성", label: "작성", path: "/create" },
    { heading: "활동", label: "활동", path: "/activity" },
    { heading: "마이", label: "마이", path: "/my" },
    { heading: "홈", label: "홈", path: "/" },
  ] as const

  for (const routeCheck of routeChecks) {
    await page.getByRole("link", { name: routeCheck.label }).click()

    // Then: routing, visible heading, and active accessibility state stay synchronized.
    await expect(page).toHaveURL(routeCheck.path)
    await expect(page.getByRole("heading", { level: 1, name: routeCheck.heading })).toBeVisible()
    await expect(page.getByRole("link", { name: routeCheck.label })).toHaveAttribute(
      "aria-current",
      "page",
    )
  }
})

test("renders active bottom navigation text with accessible contrast", async ({ page }) => {
  // Given: the light-theme Korean app is opened on an active navigation route.
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })
  await page.goto("/create")

  // When: the active navigation item rendered colors are measured from CSS.
  const activeLinkColors: ActiveLinkColors = await page
    .getByRole("link", { name: "작성" })
    .evaluate((element) => {
      const style = window.getComputedStyle(element)

      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      }
    })
  const activeContrastRatio = getContrastRatio(
    parseRgbColor(activeLinkColors.color),
    parseRgbColor(activeLinkColors.backgroundColor),
  )

  // Then: the active label meets WCAG AA text contrast in the rendered light theme.
  expect(activeContrastRatio).toBeGreaterThanOrEqual(minimumTextContrastRatio)
})

for (const viewportWidth of viewportWidths) {
  test(`keeps Stage 4 bottom navigation centered and touch-safe at ${viewportWidth.toString()}px`, async ({
    page,
  }) => {
    // When: the app shell is opened and layout metrics are collected.
    await page.goto("/create")
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    const metrics = await getNavigationMetrics(page)
    expect(metrics.navigationWidth).toBeLessThanOrEqual(430)
    expect(Math.abs(metrics.navigationCenter - metrics.viewportCenter)).toBeLessThanOrEqual(1)
    expect(metrics.mainBottom).toBeLessThanOrEqual(metrics.navigationTop)
    expect(metrics.documentOverflows).toBe(false)
    expect(metrics.linkTargets).toHaveLength(5)
    for (const linkTarget of metrics.linkTargets) {
      expect(linkTarget.width).toBeGreaterThanOrEqual(44)
      expect(linkTarget.height).toBeGreaterThanOrEqual(44)
    }
  })
}

test("renders Japanese bottom navigation labels", async ({ page }) => {
  // Given: the detector cache contains Japanese before app boot.
  await page.setViewportSize({ width: 375, height: 812 })
  await seedStorage(page, { key: i18nextStorageKey, value: "ja-JP" })

  // When: the production preview app starts on the activity route.
  await page.goto("/activity")
  const activityLink = page.getByRole("link", { name: "通知" })
  const activityBox = await activityLink.boundingBox()
  const metrics = await getNavigationMetrics(page)

  // Then: Japanese navigation labels are visible, active, touch-safe, and unclipped at 375px.
  await expect(page.getByRole("navigation", { name: "主要ナビゲーション" })).toContainText(
    "ホーム探す作成通知マイ",
  )
  await expect(activityLink).toHaveAttribute("aria-current", "page")
  expect(activityBox?.width).toBeGreaterThanOrEqual(44)
  expect(activityBox?.height).toBeGreaterThanOrEqual(44)
  expect(metrics.mainBottom).toBeLessThanOrEqual(metrics.navigationTop)
  expect(metrics.documentOverflows).toBe(false)

  await page.screenshot({
    path: "test-results/stage4-ja-375.png",
    fullPage: true,
  })
})

test("renders English fallback bottom navigation labels", async ({ page }) => {
  // Given: the detector cache contains an unsupported language before app boot.
  await seedStorage(page, { key: i18nextStorageKey, value: "fr-FR" })

  // When: the production preview app starts.
  await page.goto("/explore")

  // Then: English fallback navigation labels are visible.
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toContainText(
    "HomeExploreCreateActivityMy",
  )
})

test("redirects unknown production routes to home", async ({ page }) => {
  // Given: a user opens an unknown client route.
  await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

  // When: the route tree resolves in the browser.
  await page.goto("/not-a-route")

  // Then: the app replaces the unknown route with home.
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { level: 1, name: "홈" })).toBeVisible()
})
