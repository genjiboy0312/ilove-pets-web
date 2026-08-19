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
  it("translates Stage 6 screen labels in Korean, Japanese, and English", async () => {
    const expectedScreenLabels = {
      en: {
        explore: "Explore",
        exploreSearch: "Search pets, posts, and tags",
        create: "Create",
        createPet: "Choose a pet",
        activity: "Activity",
        activityList: "Notifications",
        my: "My",
        myPets: "Registered pets",
        settings: "Settings",
        settingsTheme: "Theme",
      },
      ja: {
        explore: "探す",
        exploreSearch: "ペット、投稿、タグを検索",
        create: "作成",
        createPet: "ペットを選択",
        activity: "通知",
        activityList: "通知",
        my: "マイ",
        myPets: "登録ペット",
        settings: "設定",
        settingsTheme: "テーマ",
      },
      ko: {
        explore: "탐색",
        exploreSearch: "반려동물, 게시물, 태그 검색",
        create: "작성",
        createPet: "펫 선택",
        activity: "활동",
        activityList: "알림",
        my: "마이",
        myPets: "등록 펫",
        settings: "설정",
        settingsTheme: "테마",
      },
    } as const

    for (const [language, screenLabels] of Object.entries(expectedScreenLabels)) {
      await i18n.changeLanguage(language)

      expect(i18n.t(($) => $.explore.heading)).toBe(screenLabels.explore)
      expect(i18n.t(($) => $.explore.searchPlaceholder)).toBe(screenLabels.exploreSearch)
      expect(i18n.t(($) => $.create.heading)).toBe(screenLabels.create)
      expect(i18n.t(($) => $.create.petPlaceholder)).toBe(screenLabels.createPet)
      expect(i18n.t(($) => $.activity.heading)).toBe(screenLabels.activity)
      expect(i18n.t(($) => $.activity.listLabel)).toBe(screenLabels.activityList)
      expect(i18n.t(($) => $.my.heading)).toBe(screenLabels.my)
      expect(i18n.t(($) => $.my.petsLabel)).toBe(screenLabels.myPets)
      expect(i18n.t(($) => $.settings.heading)).toBe(screenLabels.settings)
      expect(i18n.t(($) => $.settings.theme)).toBe(screenLabels.settingsTheme)
    }
  })

  it("interpolates Stage 6 activity and profile messages", async () => {
    await i18n.changeLanguage("ko")

    expect(i18n.t(($) => $.activity.like, { actor: "Arden" })).toBe(
      "Arden님이 회원님의 게시물을 좋아합니다.",
    )
    expect(i18n.t(($) => $.activity.comment, { actor: "Solana" })).toBe(
      "Solana님이 회원님의 게시물에 댓글을 남겼습니다.",
    )
    expect(i18n.t(($) => $.activity.follow, { actor: "Arden" })).toBe(
      "Arden님이 팔로우하기 시작했습니다.",
    )
    expect(i18n.t(($) => $.my.posts, { count: 2 })).toBe("게시물 2개")
    expect(i18n.t(($) => $.my.followers, { count: 128 })).toBe("팔로워 128명")
    expect(i18n.t(($) => $.my.following, { count: 46 })).toBe("팔로잉 46명")
  })
})
