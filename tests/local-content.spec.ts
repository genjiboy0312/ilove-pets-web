import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"
import { readFile } from "node:fs/promises"

async function seedLanguage(page: Page, language = "ko") {
  await page.addInitScript((value) => {
    localStorage.setItem("i18nextLng", value)
  }, language)
}

async function photo(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext("2d")
    if (context === null) throw new Error("Canvas unavailable")
    context.fillStyle = "#6ca17e"
    context.fillRect(0, 0, 64, 64)
    return canvas.toDataURL("image/png").split(",")[1] ?? ""
  })
  return { name: "pet.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64") }
}

async function register(page: Page, withPhoto = false) {
  await page.goto("/myaccount")
  await page.getByLabel("펫 이름", { exact: true }).fill("QA Mochi")
  await page.getByRole("combobox", { name: "카테고리", exact: true }).selectOption("CAT")
  await page.getByLabel("품종", { exact: true }).fill("Mix")
  if (withPhoto) await page.getByLabel("프로필 사진(선택)").setInputFiles(await photo(page))
  await page.getByRole("button", { name: "펫 저장", exact: true }).click()
  await expect(page.getByRole("heading", { name: "QA Mochi", exact: true })).toBeVisible()
}

async function publish(page: Page) {
  await page.goto("/create")
  await page.getByRole("combobox", { name: "펫", exact: true }).selectOption({ label: "QA Mochi" })
  await page.getByLabel("사진", { exact: true }).setInputFiles(await photo(page))
  await page.getByRole("textbox", { name: "내용", exact: true }).fill("QA first photo")
  await page.getByRole("textbox", { name: "태그", exact: true }).fill("cat cat daily")
  await page.getByRole("button", { name: "게시", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("로컬")
}

async function hasPhoto(page: Page, key: string) {
  return await page.evaluate(
    async (photoKey) =>
      await new Promise<boolean>((resolve, reject) => {
        const open = indexedDB.open("ilove-pets-local-content", 1)
        open.onerror = () => {
          reject(new Error("Database open failed"))
        }
        open.onsuccess = () => {
          const database = open.result
          const transaction = database.transaction("photos", "readonly")
          const request = transaction.objectStore("photos").get(photoKey)
          request.onsuccess = () => {
            resolve(request.result !== undefined)
            database.close()
          }
          request.onerror = () => {
            reject(new Error("Photo read failed"))
            database.close()
          }
        }
      }),
    key,
  )
}

async function metadata(page: Page) {
  return await page.evaluate(() => {
    const value: unknown = JSON.parse(
      localStorage.getItem("ilove-pets-web:local-content:v1") ?? "{}",
    )
    return value as {
      pets: { id: string; photoKey?: string }[]
      posts: { id: string; photoKey: string }[]
    }
  })
}

test("registers, publishes, persists interactions, edits, records growth and deletes connected local data", async ({
  page,
  context,
}) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await seedLanguage(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await register(page, true)
  await publish(page)
  const saved = await metadata(page)
  const postPhoto = saved.posts[0]?.photoKey ?? ""
  const petPhoto = saved.pets[0]?.photoKey ?? ""

  await page.goto("/")
  const card = page.locator("article.post-card").filter({ hasText: "QA first photo" })
  await expect(card).toBeVisible()
  await expect(card.getByRole("button", { name: "공유", exact: true })).toBeDisabled()
  await card.getByRole("button", { name: "좋아요", exact: true }).click()
  await expect(card.getByRole("button", { name: "좋아요", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await card.getByRole("button", { name: "댓글", exact: true }).click()
  const comments = page.getByRole("dialog", { name: "댓글", exact: true })
  await comments.getByRole("textbox", { name: "댓글", exact: true }).fill("QA saved comment")
  await comments.getByRole("button", { name: "등록", exact: true }).click()
  await expect(comments.getByText("QA saved comment")).toBeVisible()
  await comments.getByRole("button", { name: "닫기", exact: true }).click()
  await page.reload()
  await expect(card.getByRole("button", { name: "좋아요", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  const otherTab = await context.newPage()
  await seedLanguage(otherTab)
  await otherTab.goto("/")
  await expect(otherTab.getByText("QA first photo", { exact: true })).toBeVisible()
  await page.goto("/myaccount")
  await page.getByRole("button", { name: "수정 QA Mochi", exact: true }).click()
  let dialog = page.getByRole("dialog")
  await dialog.getByRole("textbox", { name: "내용", exact: true }).fill("QA revised photo")
  await dialog.getByRole("button", { name: "변경 저장", exact: true }).click()
  await expect(dialog.getByRole("status")).toContainText("저장")
  await expect(otherTab.getByText("QA revised photo", { exact: true })).toBeVisible()
  await otherTab.close()
  await dialog.getByRole("button", { name: "닫기", exact: true }).click()

  await page
    .getByRole("region", { name: "등록 펫", exact: true })
    .getByRole("button", { name: "QA Mochi", exact: true })
    .click()
  dialog = page.getByRole("dialog")
  await expect(dialog.getByText("아직 체중 기록이 없습니다.")).toBeVisible()
  await expect(dialog.getByText("이 펫의 게시물을 먼저 삭제한 후 펫을 삭제하세요.")).toBeVisible()
  const editor = dialog.getByRole("region", { name: "펫 수정", exact: true })
  await editor.getByLabel("펫 이름", { exact: true }).fill("QA Updated")
  await editor.getByRole("combobox", { name: "카테고리", exact: true }).selectOption("DOG")
  await editor.getByRole("button", { name: "변경 저장", exact: true }).click()
  await expect(
    dialog.getByRole("heading", { level: 2, name: "QA Updated", exact: true }),
  ).toBeVisible()
  const date = await dialog.getByLabel("날짜", { exact: true }).inputValue()
  await dialog.getByLabel("체중 (kg, 선택)").fill("3.4")
  await dialog.getByLabel("돌봄 메모 (선택)").fill("QA checkup")
  await dialog.getByRole("button", { name: "기록 저장", exact: true }).click()
  await expect(dialog.getByRole("list", { name: "저장된 기록", exact: true })).toContainText(
    "3.4 kg",
  )
  await dialog.getByRole("button", { name: `${date} (1)`, exact: true }).click()
  await expect(dialog.getByRole("region", { name: "기록 달력", exact: true })).toContainText(
    "QA checkup",
  )
  await dialog.screenshot({ path: "test-results/local-growth-calendar.png" })
  // Focus remains in the sheet and returns to the triggering pet card after Escape.
  await page.keyboard.press("Escape")
  await expect(
    page
      .getByRole("region", { name: "등록 펫", exact: true })
      .getByRole("button", { name: "QA Updated", exact: true }),
  ).toBeFocused()
  await page.reload()
  await page
    .getByRole("region", { name: "등록 펫", exact: true })
    .getByRole("button", { name: "QA Updated", exact: true })
    .click()
  await expect(page.getByRole("list", { name: "저장된 기록", exact: true })).toContainText(
    "QA checkup",
  )
  await page.keyboard.press("Escape")

  await page.goto("/explore")
  const localGrid = page.getByRole("region", { name: "이 기기의 게시물", exact: true })
  await expect(localGrid.getByRole("button", { name: "QA Updated", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "고양이", exact: true }).click()
  await expect(localGrid).toHaveCount(0)
  await page.getByRole("button", { name: "강아지", exact: true }).click()
  await localGrid.getByRole("button", { name: "QA Updated", exact: true }).click()
  await expect(page.getByRole("dialog").getByText("QA saved comment")).toBeVisible()
  await page.keyboard.press("Escape")

  await page.goto("/myaccount")
  await page.getByRole("button", { name: "수정 QA Updated", exact: true }).click()
  dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "삭제", exact: true }).click()
  await dialog.getByRole("button", { name: "취소", exact: true }).click()
  await expect(dialog.getByRole("button", { name: "영구 삭제", exact: true })).toHaveCount(0)
  await dialog.getByRole("button", { name: "삭제", exact: true }).click()
  await dialog.getByRole("button", { name: "영구 삭제", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => hasPhoto(page, postPhoto)).toBe(false)
  await page
    .getByRole("region", { name: "등록 펫", exact: true })
    .getByRole("button", { name: "QA Updated", exact: true })
    .click()
  const petEditor = page.getByRole("region", { name: "펫 수정", exact: true })
  await petEditor.getByRole("button", { name: "삭제", exact: true }).click()
  await petEditor.getByRole("button", { name: "영구 삭제", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect.poll(() => hasPhoto(page, petPhoto)).toBe(false)
  await expect(page.getByRole("heading", { name: "QA Updated", exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test("validates actual image uploads and restores text drafts without restoring the file", async ({
  page,
}) => {
  await seedLanguage(page)
  await register(page)
  await page.goto("/create")
  const input = page.getByLabel("사진", { exact: true })
  await input.setInputFiles({
    name: "fake.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  })
  await expect(page.getByRole("alert")).toContainText("이미지로 해석할 수 없는")
  await input.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  })
  await expect(page.getByRole("alert")).toContainText("5MB")
  await input.setInputFiles({
    name: "other.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF"),
  })
  await expect(page.getByRole("alert")).toContainText("JPEG")
  await input.setInputFiles(await photo(page))
  await page.getByRole("combobox", { name: "펫", exact: true }).selectOption({ label: "QA Mochi" })
  await page.getByRole("textbox", { name: "내용", exact: true }).fill("QA restored draft")
  await page.getByRole("textbox", { name: "태그", exact: true }).fill("draft")
  await page.reload()
  await expect(page.getByRole("textbox", { name: "내용", exact: true })).toHaveValue(
    "QA restored draft",
  )
  await expect(page.getByRole("combobox", { name: "펫", exact: true })).toContainText("QA Mochi")
  await expect(input).toHaveValue("")
  await page.getByRole("button", { name: "게시", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("사진")
})

test("recovers corrupt metadata with explicit reset and clears IndexedDB photos", async ({
  page,
}) => {
  await seedLanguage(page)
  await register(page, true)
  await publish(page)
  const saved = await metadata(page)
  const key = saved.posts[0]?.photoKey ?? ""
  await page.evaluate(() => {
    localStorage.setItem("ilove-pets-web:local-content:v1", "{broken")
    localStorage.setItem("ilove-pets-web:create-draft:v1", "{broken")
  })
  await page.goto("/myaccount")
  await expect(page.getByRole("alert")).toContainText("로컬 데이터")
  await page.getByRole("button", { name: "로컬 데이터 초기화", exact: true }).click()
  await page.getByRole("button", { name: "취소", exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem("ilove-pets-web:local-content:v1"))).toBe(
    "{broken",
  )
  await page.getByRole("button", { name: "로컬 데이터 초기화", exact: true }).click()
  await page.getByRole("button", { name: "모든 로컬 데이터 삭제", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("로컬 데이터를 지웠습니다")
  await expect.poll(() => hasPhoto(page, key)).toBe(false)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Bori", exact: true })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
})

for (const language of ["ko", "en", "ja"]) {
  for (const width of [375, 768, 1280]) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`keeps local editing and calendar usable at ${String(width)}px in ${language} ${colorScheme}`, async ({
        page,
      }) => {
        await seedLanguage(page, language)
        await page.addInitScript(() => {
          localStorage.setItem(
            "ilove-pets-web:local-content:v1",
            JSON.stringify({
              schemaVersion: 1,
              pets: [
                {
                  id: "pet_local_layout",
                  name: "QA Layout",
                  category: "CAT",
                  breed: "Mix",
                  createdAt: "2026-10-10T00:00:00.000Z",
                  growth: [{ id: "record_qa", date: "2026-10-10", weightKg: 3.4, note: "QA care" }],
                },
              ],
              posts: [],
            }),
          )
        })
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme })
        await page.goto("/myaccount")
        await page
          .locator(".my-pet-list")
          .getByRole("button", { name: "QA Layout", exact: true })
          .click()
        const dialog = page.getByRole("dialog", { name: "QA Layout", exact: true })
        await expect(dialog).toBeVisible()
        const bounds = await dialog.boundingBox()
        expect(bounds).not.toBeNull()
        if (bounds === null) throw new Error("Missing dialog")
        expect(bounds.x).toBeGreaterThanOrEqual(0)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1)
        const overflow = await dialog.evaluate(
          (element) => element.scrollWidth - element.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(1)
        await page.keyboard.press("Shift+Tab")
        await expect(dialog.locator("button").last()).toBeFocused()
        await dialog.screenshot({
          path: `test-results/local-editor-${language}-${String(width)}-${colorScheme}.png`,
        })
        await page.keyboard.press("Escape")
        await expect(dialog).toHaveCount(0)
        await page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight)
        })
        const backupPanel = page.locator('.local-backup[aria-labelledby="local-backup-title"]')
        expect(
          await backupPanel.evaluate((element) => element.scrollWidth - element.clientWidth),
        ).toBeLessThanOrEqual(1)
        await backupPanel.screenshot({
          path: `test-results/backup-${language}-${String(width)}-${colorScheme}.png`,
        })
      })
    }
  }
}

test("backs up photos and records, restores in a fresh browser and preserves data on invalid import and cancel", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000)
  await seedLanguage(page)
  await register(page, true)
  await publish(page)
  await page.goto("/myaccount")
  await page
    .getByRole("region", { name: "등록 펫", exact: true })
    .getByRole("button", { name: "QA Mochi", exact: true })
    .click()
  await page.getByLabel("체중 (kg, 선택)").fill("3.4")
  await page.getByLabel("돌봄 메모 (선택)").fill("Backup care")
  await page.getByRole("button", { name: "기록 저장", exact: true }).click()
  await expect(page.getByRole("list", { name: "저장된 기록" })).toContainText("Backup care")
  await page.keyboard.press("Escape")
  await page.goto("/")
  const card = page.locator("article.post-card").filter({ hasText: "QA first photo" })
  await card.getByRole("button", { name: "좋아요", exact: true }).click()
  await card.getByRole("button", { name: "댓글", exact: true }).click()
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "댓글", exact: true })
    .fill("Backup comment")
  await page.getByRole("dialog").getByRole("button", { name: "등록", exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText("Backup comment")
  await page.keyboard.press("Escape")
  await page.goto("/myaccount")
  const downloadEvent = page.waitForEvent("download")
  await page.getByRole("button", { name: "백업 다운로드", exact: true }).click()
  const download = await downloadEvent
  const backupPath = await download.path()
  const payload = await readFile(backupPath)
  const targetContext = await browser.newContext()
  try {
    const target = await targetContext.newPage()
    await seedLanguage(target)
    await target.goto("/myaccount")
    const fileInput = target.getByLabel("백업 파일 선택", { exact: true })
    await fileInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: payload,
    })
    await expect(target.getByRole("status")).toContainText("사진 2장")
    await target.getByRole("button", { name: "로컬 데이터 교체 후 복원", exact: true }).click()
    await expect(
      target.getByRole("status").filter({ hasText: "백업을 복원했습니다" }),
    ).toBeVisible()
    const restored = await metadata(target)
    expect(restored.pets).toHaveLength(1)
    expect(restored.posts).toHaveLength(1)
    expect(await hasPhoto(target, restored.posts[0]?.photoKey ?? "")).toBe(true)
    expect(await hasPhoto(target, restored.pets[0]?.photoKey ?? "")).toBe(true)
    await target.reload()
    await expect(target.getByRole("heading", { name: "QA Mochi", exact: true })).toBeVisible()
    await target
      .getByRole("region", { name: "등록 펫", exact: true })
      .getByRole("button", { name: "QA Mochi", exact: true })
      .click()
    await expect(target.getByRole("list", { name: "저장된 기록" })).toContainText("Backup care")
    await target.keyboard.press("Escape")
    await target.goto("/")
    const restoredCard = target.locator("article.post-card").filter({ hasText: "QA first photo" })
    await expect(restoredCard.locator(".post-card__image")).toBeVisible()
    await expect(restoredCard.getByRole("button", { name: "좋아요", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await restoredCard.getByRole("button", { name: "댓글", exact: true }).click()
    await expect(target.getByRole("dialog")).toContainText("Backup comment")
    await target.keyboard.press("Escape")
    await target.goto("/myaccount")
    const before = await metadata(target)
    await fileInput.setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    })
    await expect(target.getByRole("alert")).toContainText("올바른")
    expect(await metadata(target)).toEqual(before)
    await fileInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: payload,
    })
    await target.getByRole("button", { name: "취소", exact: true }).click()
    expect(await metadata(target)).toEqual(before)
    await fileInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: payload,
    })
    await expect(target.getByRole("status")).toContainText("사진 2장")
    await target.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem.bind(localStorage)
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === "ilove-pets-web:local-content:v1")
          throw new DOMException("quota", "QuotaExceededError")
        originalSetItem.call(this, key, value)
      }
    })
    await target.getByRole("button", { name: "로컬 데이터 교체 후 복원", exact: true }).click()
    await expect(target.getByRole("alert")).toContainText("기존 데이터는 유지")
    expect(await metadata(target)).toEqual(before)
    expect(await hasPhoto(target, before.posts[0]?.photoKey ?? "")).toBe(true)
    await target.reload()
    await target.screenshot({ path: "test-results/local-backup.png", fullPage: true })
    await target.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
    })
    await target
      .locator('.local-backup[aria-labelledby="local-backup-title"]')
      .screenshot({ path: "test-results/local-backup-panel.png" })
  } finally {
    await targetContext.close()
  }
})

test("serializes actual concurrent registration from two tabs without losing either pet", async ({
  page,
  context,
}) => {
  await seedLanguage(page)
  const second = await context.newPage()
  await seedLanguage(second)
  for (const target of [page, second]) {
    await target.goto("/myaccount")
    await target
      .getByLabel("펫 이름", { exact: true })
      .fill(target === page ? "Tab One" : "Tab Two")
    await target.getByLabel("품종", { exact: true }).fill("Mix")
  }
  await Promise.all(
    [page, second].map(async (target) => {
      await target.getByRole("button", { name: "펫 저장", exact: true }).click()
    }),
  )
  await expect(page.getByRole("heading", { name: "Tab Two", exact: true })).toBeVisible()
  await expect(second.getByRole("heading", { name: "Tab One", exact: true })).toBeVisible()
  expect((await metadata(page)).pets).toHaveLength(2)
  await second.close()
})

test("shows a recoverable startup message instead of a blank screen when the app bundle fails", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" })
  const page = await context.newPage()
  try {
    await seedLanguage(page)
    await page.route("**/assets/*.js", (route) => route.abort())
    await page.goto("/")
    await expect(page.getByRole("alert")).toContainText("앱을 불러오지 못했습니다")
    await expect(
      page.getByRole("button", { name: "다시 불러오기 / Reload", exact: true }),
    ).toBeVisible()
    await page.unroute("**/assets/*.js")
    await page.getByRole("button", { name: "다시 불러오기 / Reload", exact: true }).click()
    await expect(page.getByRole("heading", { name: "홈", exact: true })).toBeVisible()
    await page.screenshot({ path: "test-results/home-recovered.png" })
  } finally {
    await context.close()
  }
})

test("loads the cached app offline and never substitutes HTML for a missing script", async ({
  page,
  context,
}) => {
  await seedLanguage(page)
  await page.goto("/")
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
  await page.reload()
  await expect(page.getByRole("heading", { name: "홈", exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("ilove-pets-cache-v4")
        const keys = await cache.keys()
        return keys.some((key) => key.url.includes("/assets/") && key.url.endsWith(".js"))
      }),
    )
    .toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole("heading", { name: "홈", exact: true })).toBeVisible()
  const scriptFailed = await page.evaluate(async () => {
    try {
      await fetch("/assets/missing.js")
      return false
    } catch {
      return true
    }
  })
  expect(scriptFailed).toBe(true)
  await context.setOffline(false)
})

test("continues booting when optional remote fonts fail", async ({ page }) => {
  await seedLanguage(page)
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort())
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "홈", exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
  await expect(page.getByRole("alert")).toHaveCount(0)
})
