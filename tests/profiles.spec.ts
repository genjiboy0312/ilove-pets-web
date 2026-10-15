import { expect, test } from "@playwright/test"
import { setup } from "./support/social-fixture"

test("cloud My edits profile/photo, links to public profile and creates a private cloud post", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  const png = await setup(page)
  await page.goto("/myaccount")
  expect(
    (await page.getByRole("group", { name: "저장 위치" }).boundingBox())?.width,
  ).toBeGreaterThan(300)
  await expect(
    page
      .getByRole("group", { name: "저장 위치" })
      .getByRole("button", { name: "클라우드", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { name: "우리집", exact: true })).toBeVisible()
  await page.getByText("프로필 수정", { exact: true }).click()
  await page.getByLabel("사용자 이름", { exact: true }).fill("reserved")
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "이미 사용 중" })).toBeVisible()
  await page.getByLabel("사용자 이름", { exact: true }).fill("new_family")
  await page.getByLabel("닉네임", { exact: true }).fill("새로운 가족")
  await page.getByLabel("소개", { exact: true }).fill("공개 소개")
  await page
    .getByLabel("프로필 사진", { exact: true })
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png })
  await page.getByRole("button", { name: "프로필 저장", exact: true }).click()
  await expect(page.getByText("프로필을 저장했습니다.", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "새로운 가족", exact: true })).toBeVisible()
  await page.getByRole("link", { name: "내 공개 프로필 보기", exact: true }).click()
  await expect(page).toHaveURL(/\/users\/new_family$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "계정 프로필", exact: true }),
  ).toBeVisible()
  await expect(
    page
      .getByRole("region", { name: "계정 프로필", exact: true })
      .getByText("공개 소개", { exact: true }),
  ).toBeVisible()
  await expect(page.locator(".account-profile__avatar img")).toBeVisible()
  await page.goto("/create?destination=cloud")
  await expect(
    page.getByRole("heading", { name: "클라우드 게시글 작성", exact: true }),
  ).toBeVisible()
  await page.getByLabel("게시물 본문").fill("새 클라우드 글")
  await page
    .getByLabel("사진 (JPEG/PNG/WebP, 5 MiB 이하)")
    .setInputFiles({ name: "post.png", mimeType: "image/png", buffer: png })
  await page.getByRole("button", { name: "클라우드에 저장", exact: true }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "저장 후 서버 데이터를 갱신했습니다." }),
  ).toBeVisible()
  await page.goto("/myaccount")
  await page.locator("summary").filter({ hasText: "게시물 · 펫 · 성장 기록" }).click()
  await expect(page.getByText("새 클라우드 글", { exact: true })).toBeVisible()
  await expect(
    page.locator(".social-publish p").filter({ hasText: /^비공개 게시물$/ }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "test-results/account-cloud-mobile.png", fullPage: true })
})
test("following feed choice survives navigation and reload; swipe changes story", async ({
  page,
}, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  await page.goto("/")
  await page.getByRole("button", { name: "공개 피드", exact: true }).click()
  await page.getByRole("button", { name: "팔로잉 피드", exact: true }).click()
  await expect(page.locator(".social-card")).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole("button", { name: "공개 피드", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByRole("button", { name: "팔로잉 피드", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.locator(".social-card").getByRole("button", { name: "팔로잉", exact: true }).click()
  await expect(
    page.getByText("팔로우한 계정의 공개 글이 없습니다. 전체 피드에서 친구를 찾아보세요."),
  ).toBeVisible()
  await page.getByRole("button", { name: "전체", exact: true }).click()
  await page.locator(".social-card").getByRole("button", { name: "팔로우", exact: true }).click()
  await page
    .getByRole("region", { name: "팔로우한 사람들의 스토리" })
    .getByRole("button", { name: "보리네", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toBeVisible()
  const photo = page.locator(".story-photo")
  const box = await photo.boundingBox()
  if (!box) throw new Error("story photo missing")
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.5, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("story image failures offer a working retry", async ({ page }, info) => {
  test.skip(info.project.metadata["authConfigured"] !== true, "Public auth build required")
  await setup(page)
  await page.goto("/")
  const rail = page.getByRole("region", { name: "팔로우한 사람들의 스토리" })
  await expect(rail.locator("img")).toBeVisible()
  await page.route(
    "**/functions/v1/social-media?asset=*",
    (route) => route.fulfill({ status: 503, headers: { "Access-Control-Allow-Origin": "*" } }),
    { times: 1 },
  )
  await rail.getByRole("button", { name: "보리네", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "사진 다시 불러오기", exact: true }).click()
  await expect(dialog.locator(".story-photo img")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
})
