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

  it("translates Home category labels in Korean, Japanese, and English", async () => {
    const expectedCategoryLabels = {
      en: ["All", "Dogs", "Cats", "Reptiles", "Birds", "Small animals", "Other"],
      ja: ["すべて", "犬", "猫", "爬虫類", "鳥", "小動物", "その他"],
      ko: ["전체", "강아지", "고양이", "파충류", "조류", "소동물", "기타"],
    } as const

    for (const [language, categoryLabels] of Object.entries(expectedCategoryLabels)) {
      await i18n.changeLanguage(language)

      expect(i18n.t(($) => $.home.heading)).toBe(
        language === "ko" ? "홈" : language === "ja" ? "ホーム" : "Home",
      )
      expect(i18n.t(($) => $.home.categoryLabel)).toBe(
        language === "ko"
          ? "반려동물 카테고리"
          : language === "ja"
            ? "ペットカテゴリー"
            : "Pet categories",
      )
      expect([
        i18n.t(($) => $.home.categories.all),
        i18n.t(($) => $.home.categories.dog),
        i18n.t(($) => $.home.categories.cat),
        i18n.t(($) => $.home.categories.reptile),
        i18n.t(($) => $.home.categories.bird),
        i18n.t(($) => $.home.categories.smallAnimal),
        i18n.t(($) => $.home.categories.etc),
      ]).toEqual(categoryLabels)
    }
  })

  it("translates Home feed actions, metrics, time, and alt text", async () => {
    await i18n.changeLanguage("ko")

    expect(i18n.t(($) => $.home.feedLabel)).toBe("반려동물 피드")
    expect(i18n.t(($) => $.home.empty)).toBe("이 카테고리에는 아직 게시물이 없습니다.")
    expect(i18n.t(($) => $.home.actions.like)).toBe("좋아요")
    expect(i18n.t(($) => $.home.actions.comment)).toBe("댓글")
    expect(i18n.t(($) => $.home.actions.share)).toBe("공유")
    expect(i18n.t(($) => $.home.metrics.likeCount, { count: 3 })).toBe("좋아요 3개")
    expect(i18n.t(($) => $.home.metrics.commentCount, { count: 2 })).toBe("댓글 2개")
    expect(i18n.t(($) => $.home.time.postedAt, { time: "방금" })).toBe("방금 게시")
    expect(i18n.t(($) => $.home.alt.petAvatar, { petName: "초코" })).toBe("초코 프로필 사진")
    expect(i18n.t(($) => $.home.alt.postImage, { petName: "초코" })).toBe("초코 게시물 이미지")
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
    expect(i18n.t(($) => $.home.categories.dog)).toBe("Dogs")
    expect(i18n.t(($) => $.home.actions.share)).toBe("Share")
    expect(localStorage.getItem("i18nextLng")).toBe("en")
    expect(i18n.options.react?.useSuspense).toBe(false)
  })
})
