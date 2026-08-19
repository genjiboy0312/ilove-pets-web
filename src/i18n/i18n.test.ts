import { beforeEach, describe, expect, it } from "vitest"

import { i18n, initializeI18n, normalizeDetectedLanguage } from "./i18n"
import { resources } from "./resources"

describe("i18n bundled resources", () => {
  beforeEach(async () => {
    // Given: each test starts from a clean browser language cache.
    localStorage.clear()
    await initializeI18n()
    await i18n.changeLanguage("en")
  })

  it("translates the current app shell in Korean, Japanese, and English", async () => {
    // Given: bundled resources exist for every supported Stage 3 language.
    const languages = Object.keys(resources)

    // When: each language is activated through i18next.
    const translatedTitles: readonly string[] = await Promise.all(
      languages.map(async (language) => {
        await i18n.changeLanguage(language)

        return i18n.t(($) => $.app.title)
      }),
    )

    // Then: the visible app identity remains translated and available in every bundle.
    expect(translatedTitles).toEqual(["iLove Pets", "iLove Pets", "iLove Pets"])
    await i18n.changeLanguage("en")
    expect(i18n.t(($) => $.setup.label)).toBe("Frontend foundation ready")
  })

  it("normalizes detected browser language families to supported resources", () => {
    // Given: detector inputs include exact, regional, and unsupported languages.
    const detectedLanguages = ["ko-KR", "ja-JP", "en-US", "fr-FR", undefined]

    // When: detector values are converted before i18next loads resources.
    const normalizedLanguages = detectedLanguages.map((language) =>
      normalizeDetectedLanguage(language),
    )

    // Then: Korean, Japanese, and English families survive while unsupported values fall back to English.
    expect(normalizedLanguages).toEqual(["ko", "ja", "en", "en", "en"])
  })

  it("uses English fallback and localStorage detector caching without suspense", async () => {
    // Given: i18next is initialized for bundled browser usage.
    await i18n.changeLanguage("fr-FR")

    // When: an unsupported language is requested.
    const fallbackLabel = i18n.t(($) => $.theme.options.dark)

    // Then: English is used, the detector cache key is stable, and React suspense stays disabled.
    expect(fallbackLabel).toBe("Dark")
    expect(localStorage.getItem("i18nextLng")).toBe("en")
    expect(i18n.options.react?.useSuspense).toBe(false)
  })
})
