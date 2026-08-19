import { expect, test } from "@playwright/test"

const viewportWidths = [375, 768, 1280]
const minimumTextContrastRatio = 4.5

interface RgbColor {
  readonly red: number
  readonly green: number
  readonly blue: number
}

interface SetupListColors {
  readonly color: string
  readonly backgroundColor: string
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
  test(`renders Stage 1 shell at ${viewportWidth.toString()}px`, async ({ page }) => {
    // Given: a production preview viewport for the Stage 1 app shell.
    await page.setViewportSize({ width: viewportWidth, height: 812 })

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
    const setupListColors: SetupListColors = await page
      .locator(".setup-status__list")
      .evaluate((element) => {
        const style = window.getComputedStyle(element)

        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
        }
      })
    const setupListContrastRatio = getContrastRatio(
      parseRgbColor(setupListColors.color),
      parseRgbColor(setupListColors.backgroundColor),
    )

    await expect(page.getByRole("heading", { level: 1, name: "iLove Pets" })).toBeVisible()
    await expect(page.getByRole("status")).toContainText("프론트엔드 기반 준비 완료")
    await expect(page.getByRole("main")).toHaveCount(1)
    await expect(
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).resolves.toBe(true)
    expect(setupListContrastRatio).toBeGreaterThanOrEqual(minimumTextContrastRatio)
    expect(productionText).not.toMatch(/react-grab|react-scan/i)

    await page.screenshot({
      path: `test-results/stage1-${viewportWidth.toString()}.png`,
      fullPage: true,
    })
  })
}
