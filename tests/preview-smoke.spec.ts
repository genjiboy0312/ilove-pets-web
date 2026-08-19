import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

import { themePreferenceStorageKey } from "../src/theme/themePreference"

const viewportWidths = [375, 768, 1280]
const minimumTextContrastRatio = 4.5
const i18nextStorageKey = "i18nextLng"

interface RgbColor {
  readonly red: number
  readonly green: number
  readonly blue: number
}

interface HomeCategoryColors {
  readonly color: string
  readonly backgroundColor: string
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

for (const viewportWidth of viewportWidths) {
  test(`renders Stage 4 shell at ${viewportWidth.toString()}px`, async ({ page }) => {
    // Given: a production preview viewport for the Stage 4 app shell.
    await page.setViewportSize({ width: viewportWidth, height: 812 })
    await seedStorage(page, { key: i18nextStorageKey, value: "ko-KR" })

    // When: the app is opened from the Vite preview server.
    await page.goto("/")

    // Then: the semantic shell and production bundle boundaries are observable.
    const productionText = await page.evaluate(() => {
      const scriptText = Array.from(
        document.scripts,
        (script) => `${script.src} ${script.textContent}`,
      ).join(" ")

      return `${document.documentElement.textContent} ${scriptText}`
    })
    const selectedCategoryColors: HomeCategoryColors = await page
      .getByRole("button", { exact: true, name: "전체" })
      .evaluate((element) => {
        const style = window.getComputedStyle(element)

        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
        }
      })
    const selectedCategoryContrastRatio = getContrastRatio(
      parseRgbColor(selectedCategoryColors.color),
      parseRgbColor(selectedCategoryColors.backgroundColor),
    )

    await expect(page.getByRole("heading", { level: 1, name: "홈" })).toBeVisible()
    await expect(page.getByRole("feed", { name: "반려동물 피드" })).toBeVisible()
    await expect(page.getByRole("main")).toHaveCount(1)
    await expect(
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).resolves.toBe(true)
    expect(selectedCategoryContrastRatio).toBeGreaterThanOrEqual(minimumTextContrastRatio)
    expect(productionText).not.toMatch(/react-grab|react-scan/i)

    await page.screenshot({
      path: `test-results/stage4-${viewportWidth.toString()}.png`,
      fullPage: true,
    })
  })
}

test("applies persisted dark theme to the production root", async ({ page }) => {
  // Given: the browser has a stored dark theme preference before app boot.
  await seedStorage(page, { key: themePreferenceStorageKey, value: "dark" })

  // When: the production preview app starts.
  await page.goto("/")

  // Then: the root theme and browser color scheme are dark.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark")
})

test("applies persisted light theme to the production root", async ({ page }) => {
  // Given: the browser has a stored light theme preference before app boot.
  await seedStorage(page, { key: themePreferenceStorageKey, value: "light" })

  // When: the production preview app starts.
  await page.goto("/")

  // Then: the root theme and browser color scheme are light.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light")
})

test("renders Japanese copy from the detected stored language", async ({ page }) => {
  // Given: the detector cache contains Japanese before app boot.
  await seedStorage(page, { key: i18nextStorageKey, value: "ja-JP" })

  // When: the production preview app starts.
  await page.goto("/")

  // Then: Japanese bundled copy is rendered without adding screenshot coverage.
  await expect(page.getByRole("heading", { level: 1, name: "ホーム" })).toBeVisible()
  await expect(page.getByRole("region", { name: "ペットカテゴリー" })).toBeVisible()
  await expect(page.getByRole("button", { name: "システム" })).toBeVisible()
})

test("falls back to English for unsupported stored language", async ({ page }) => {
  // Given: the detector cache contains an unsupported language before app boot.
  await seedStorage(page, { key: i18nextStorageKey, value: "fr-FR" })

  // When: the production preview app starts.
  await page.goto("/")

  // Then: English fallback copy is rendered.
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Pet categories" })).toBeVisible()
  await expect(page.getByRole("button", { name: "System" })).toBeVisible()
})
