import { expect, test } from "@playwright/test"
import type { Browser, Page } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { setup, post } from "../support/social-fixture"

async function recording(browser: Browser) {
  await mkdir("docs/demo", { recursive: true })
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:5178",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    locale: "ko-KR",
    serviceWorkers: "block",
    recordVideo: { dir: "test-results/portfolio/raw", size: { width: 390, height: 844 } },
  })
  // Fixture page routes take precedence. Any unmatched external traffic is blocked.
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:5178"
      ? route.continue()
      : route.abort(),
  )
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
  })
  return {
    page,
    async save(name: string) {
      const video = page.video()
      await context.close()
      if (!video) throw new Error("Recording unavailable")
      await video.saveAs(`docs/demo/${name}.webm`)
    },
  }
}

async function caption(page: Page, text: string, note: string) {
  await page.evaluate(
    ({ text, note }) => {
      let caption = document.getElementById("portfolio-recording-caption")
      if (!caption) {
        caption = document.createElement("aside")
        caption.id = "portfolio-recording-caption"
        caption.style.cssText =
          "position:fixed;z-index:2147483647;left:10px;right:10px;bottom:82px;padding:10px 14px;border-radius:12px;background:#163a2ff2;color:white;font:600 14px/1.5 sans-serif;pointer-events:none;box-shadow:0 2px 12px #0002"
        document.body.append(caption)
      }
      caption.replaceChildren()
      const title = document.createElement("div")
      title.textContent = text
      const detail = document.createElement("div")
      detail.textContent = note
      detail.style.cssText = "font-size:11px;font-weight:400;opacity:.85"
      caption.append(title, detail)
    },
    { text, note },
  )
  // Deliberate readable pauses in presentation recordings, not test synchronization.
  await page.waitForTimeout(2600)
}

test("01 fresh device: register, write and reload", async ({ browser }) => {
  const clip = await recording(browser),
    { page } = clip
  try {
    await page.goto("/myaccount")
    await expect(page.locator(".account-welcome")).toBeVisible()
    await caption(page, "01 · 로그인 없이 나의 기록 시작", "실제 브라우저 저장 · 새 기기 컨텍스트")
    await page.getByRole("button", { name: "로그인 없이 기기 기록 사용하기" }).click()
    await page.getByLabel("펫 이름", { exact: true }).fill("포트폴리오 코기")
    await page.getByRole("combobox", { name: "카테고리", exact: true }).selectOption("DOG")
    await page.getByLabel("품종", { exact: true }).fill("웰시코기")
    await caption(page, "나의 반려동물을 등록합니다", "샘플 펫과 직접 등록한 펫은 구분됩니다")
    await page.getByRole("button", { name: "펫 저장", exact: true }).click()
    await expect(page.getByRole("heading", { name: "포트폴리오 코기", exact: true })).toBeVisible()
    await page.goto("/create")
    await page
      .getByRole("combobox", { name: "펫", exact: true })
      .selectOption({ label: "포트폴리오 코기" })
    await page
      .getByLabel("사진", { exact: true })
      .setInputFiles("public/images/pet-family-welcome-v1.webp")
    await page
      .getByRole("textbox", { name: "내용", exact: true })
      .fill("우리 가족의 첫 기록입니다. 오늘도 함께해서 행복해요!")
    await page.getByRole("textbox", { name: "태그", exact: true }).fill("가족 일상")
    await caption(page, "사진과 일상을 함께 저장", "사진: 프로젝트의 AI 생성 동물 가족 에셋")
    await page.getByRole("button", { name: "게시", exact: true }).click()
    await expect(page.getByRole("status")).toContainText("로컬")
    await page.goto("/")
    const card = page.locator("article.post-card").filter({ hasText: "우리 가족의 첫 기록" })
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await caption(
      page,
      "저장한 글을 홈에서 확인",
      "기기 자료는 로그인만으로 자동 업로드되지 않습니다",
    )
    await page.reload()
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await caption(page, "새로고침 후에도 기록 유지", "localStorage 메타데이터 + IndexedDB 사진")
  } finally {
    await clip.save("01-device-journal")
  }
})

test("02 social: public post, likes and comments", async ({ browser }) => {
  const clip = await recording(browser),
    { page } = clip
  try {
    await setup(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/posts/" + post)
    const card = page.locator(".social-card")
    await expect(card).toBeVisible()
    await caption(
      page,
      "02 · 공개한 기록으로 소통",
      "모의 API · 테스트 계정 · 실제 서버에 글을 쓰지 않습니다",
    )
    const like = card.getByRole("button", { name: "좋아요", exact: true })
    await like.click()
    await expect(card.getByRole("button", { name: "좋아요 취소", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await caption(
      page,
      "좋아요 상태를 서버 응답에 맞춰 갱신",
      "이 영상의 응답은 테스트 fixture로 재현했습니다",
    )
    const comments = page.locator(".social-comments")
    await comments.getByRole("textbox").fill("보리와 함께한 산책이 즐거워 보여요!")
    await comments.getByRole("button", { name: "등록", exact: true }).click()
    await expect(
      comments.getByText("보리와 함께한 산책이 즐거워 보여요!", { exact: true }),
    ).toBeVisible()
    await comments.scrollIntoViewIfNeeded()
    await caption(page, "댓글을 남기고 소통합니다", "개인 기록과 공개 소셜 반응을 분리한 구조")
    await page.reload()
    await expect(
      comments.getByText("보리와 함께한 산책이 즐거워 보여요!", { exact: true }),
    ).toBeVisible()
    await page.goto("/users/bori_family")
    await expect(page.getByRole("heading", { name: "계정 프로필", exact: true })).toBeVisible()
    await caption(page, "공개 프로필과 팔로우로 연결", "이메일·비공개 기록은 공개 프로필에서 제외")
  } finally {
    await clip.save("02-public-social")
  }
})

test("03 safety: report retry and block confirmation", async ({ browser }) => {
  const clip = await recording(browser),
    { page } = clip
  try {
    await setup(page)
    await page.setViewportSize({ width: 390, height: 844 })
    let attempts = 0,
      blocked = false
    await page.route("**/rest/v1/rpc/report_content", (route) => {
      attempts++
      return route.fulfill({
        status: attempts === 1 ? 429 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          attempts === 1 ? { code: "PT429", message: "rate limit" } : "demo-report",
        ),
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    })
    await page.route("**/rest/v1/rpc/set_user_block", (route) => {
      blocked = true
      return route.fulfill({
        contentType: "application/json",
        body: "null",
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    })
    await page.goto("/posts/" + post)
    const safety = page.locator(".social-card > .safety-actions")
    await safety.locator("summary").click()
    await caption(
      page,
      "03 · 안전 기능과 오류 복구",
      "S5 미배포 작업본 · 모든 신고/차단 요청은 모의 처리",
    )
    await safety.getByLabel("신고 사유").selectOption("privacy")
    await safety.getByLabel("추가 설명 (선택)").fill("개인정보 노출이 우려됩니다. (시연 자료)")
    await safety.getByRole("button", { name: "신고 접수", exact: true }).click()
    await expect(safety.getByRole("alert")).toBeVisible()
    await safety.getByRole("alert").scrollIntoViewIfNeeded()
    await caption(
      page,
      "요청 제한도 성공으로 표시하지 않습니다",
      "429 오류를 재현 · 기다린 뒤 사용자가 다시 시도",
    )
    await safety.getByRole("button", { name: "신고 접수", exact: true }).click()
    await expect(safety.getByRole("status")).toContainText("운영자가 검토")
    await caption(
      page,
      "성공 응답을 받은 뒤 접수 안내",
      "신고만으로 콘텐츠가 자동 삭제되지는 않습니다",
    )
    await safety.getByRole("button", { name: "이 사용자 차단", exact: true }).click()
    expect(blocked).toBe(false)
    await safety.getByRole("button", { name: "내용을 확인하고 차단" }).scrollIntoViewIfNeeded()
    await caption(
      page,
      "차단은 영향을 설명하고 다시 확인",
      "이 단계까지 요청 0회 · 확인 후에만 차단 요청",
    )
    await safety.getByRole("button", { name: "내용을 확인하고 차단" }).click()
    await expect.poll(() => blocked).toBe(true)
    await caption(
      page,
      "명시적인 확인 후 차단 요청 완료",
      "실제 차단 권한·양방향 제한은 격리 DB 검사로 별도 검증",
    )
  } finally {
    await clip.save("03-safety-recovery")
  }
})
