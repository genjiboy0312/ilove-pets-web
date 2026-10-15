import { expect, test } from "@playwright/test"
import { writeFile } from "node:fs/promises"

test("guides first use from Create to registration and reports only local data", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
  })
  await page.goto("/create")
  await page.getByRole("link", { name: "내 펫 등록하고 시작", exact: true }).click()
  await expect(page).toHaveURL(/myaccount\?destination=local#pet-registration/)
  await page.getByLabel("펫 이름", { exact: true }).fill("First Pet")
  await page.getByLabel("품종", { exact: true }).fill("Mix")
  await page.getByRole("button", { name: "펫 저장", exact: true }).click()
  await expect(page.getByRole("heading", { name: "First Pet", exact: true })).toBeVisible()
  const summary = page.getByRole("region", { name: "이 기기의 데이터", exact: true })
  await expect(summary).toContainText("펫 1마리 · 게시물 0개 · 성장 기록 0개")
  await expect(summary).toContainText("저장된 사진 0장")
  await expect(page.locator(".my-pet-list .content-origin[data-local=true]")).toHaveCount(1)
  await expect(page.locator(".my-pet-list .content-origin[data-local=false]")).toHaveCount(2)
  await page.getByRole("link", { name: "게시물 작성", exact: true }).click()
  await expect(page.getByRole("combobox", { name: "펫", exact: true })).toContainText("First Pet")
  await expect(page.getByRole("link", { name: "내 펫 등록하고 시작", exact: true })).toHaveCount(0)
})

test("measures a large local feed and verifies Blob URLs are released when leaving it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
    const originalRevoke = URL.revokeObjectURL.bind(URL)
    const state = { created: 0, revoked: 0, photoOpens: 0 }
    const originalOpen = indexedDB.open.bind(indexedDB)
    indexedDB.open = (name, version) => {
      state.photoOpens += 1
      return originalOpen(name, version)
    }
    const originalCreate = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      state.created += 1
      return originalCreate(blob)
    }
    URL.revokeObjectURL = (url) => {
      state.revoked += 1
      originalRevoke(url)
    }
    Object.defineProperty(window, "qaBlobCounts", { value: state })
  })
  await page.goto("/")
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 480
    const context = canvas.getContext("2d")
    if (context === null) throw new Error("Missing canvas")
    context.fillStyle = "#649d83"
    context.fillRect(0, 0, 640, 480)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value === null) reject(new Error("No image"))
        else resolve(value)
      }, "image/png")
    })
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("ilove-pets-local-content", 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore("photos")
      }
      request.onerror = () => {
        reject(new Error("IDB open"))
      }
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction("photos", "readwrite")
        transaction.objectStore("photos").put(blob, "large-feed-photo")
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
        transaction.onerror = () => {
          database.close()
          reject(new Error("IDB write"))
        }
      }
    })
    localStorage.setItem(
      "ilove-pets-web:local-content:v1",
      JSON.stringify({
        schemaVersion: 1,
        pets: [
          {
            id: "pet_local_load",
            name: "Load Pet",
            category: "CAT",
            breed: "Mix",
            createdAt: "2026-10-10T00:00:00.000Z",
          },
        ],
        posts: Array.from({ length: 200 }, (_, index) => ({
          id: `post_local_load_${String(index)}`,
          petId: "pet_local_load",
          photoKey: "large-feed-photo",
          content: `Load post ${String(index)}`,
          tags: [],
          createdAt: "2026-10-10T00:00:00.000Z",
        })),
      }),
    )
    window.dispatchEvent(new Event("ilove-pets-local-content-change"))
  })
  const started = Date.now()
  await expect(page.locator("article[data-origin=local]")).toHaveCount(200)
  const feedReadyMs = Date.now() - started
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.getByRole("link", { name: "커뮤니티", exact: true }).click()
  const counts = await page.evaluate(
    () =>
      Reflect.get(window, "qaBlobCounts") as {
        created: number
        revoked: number
        photoOpens: number
      },
  )
  expect(counts.revoked).toBeGreaterThanOrEqual(200)
  expect(counts.created - counts.revoked).toBe(0)
  expect(counts.photoOpens).toBeLessThanOrEqual(6)
  await page.getByRole("link", { name: "내 계정", exact: true }).click()
  await page.getByRole("button", { name: "로그인 없이 기기 기록 사용하기" }).click()
  const summary = page.getByRole("region", { name: "이 기기의 데이터", exact: true })
  await expect(summary).toContainText("게시물 200개")
  await expect(summary).toContainText("저장된 사진 1장")
  await summary.screenshot({ path: "test-results/local-storage-summary.png" })
  await writeFile(
    "test-results/local-performance.json",
    JSON.stringify(
      { posts: 200, distinctPhotos: 1, imageDimensions: "640x480", feedReadyMs, ...counts },
      null,
      2,
    ),
  )
})
