import { expect, test } from "@playwright/test"

test("edits growth records, cancels changes and keeps calendar, chart and saved data consistent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("i18nextLng", "ko")
    if (localStorage.getItem("ilove-pets-web:local-content:v1") !== null) return
    localStorage.setItem(
      "ilove-pets-web:local-content:v1",
      JSON.stringify({
        schemaVersion: 1,
        pets: [
          {
            id: "pet_edit",
            name: "Edit Pet",
            category: "CAT",
            breed: "Mix",
            createdAt: "2026-10-10T00:00:00.000Z",
            growth: [{ id: "record1", date: "2024-02-29", note: "Original", weightKg: 3 }],
          },
          {
            id: "pet_other",
            name: "Other Pet",
            category: "DOG",
            breed: "Mix",
            createdAt: "2026-10-10T00:00:00.000Z",
            growth: [{ id: "other", date: "2024-02-28", note: "Unchanged", weightKg: 8 }],
          },
        ],
        posts: [],
      }),
    )
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/myaccount?destination=local")
  await page.getByRole("button", { name: "Edit Pet", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Edit Pet", exact: true })
  await dialog.getByRole("button", { name: "기록 수정 2024-02-29 Original", exact: true }).click()
  await dialog.getByLabel("돌봄 메모 (선택)").fill("Cancelled")
  await dialog.getByRole("button", { name: "취소", exact: true }).click()
  await expect(dialog.getByRole("list", { name: "저장된 기록" })).toContainText("Original")
  await dialog.getByRole("button", { name: "기록 수정 2024-02-29 Original", exact: true }).click()
  await dialog.getByLabel("날짜", { exact: true }).fill("2026-10-09")
  await dialog.getByLabel("체중 (kg, 선택)").fill("4.5")
  await dialog.getByLabel("돌봄 메모 (선택)").fill("Revised")
  await dialog
    .getByRole("region", { name: "성장 기록 추가", exact: true })
    .getByRole("button", { name: "변경 저장", exact: true })
    .click()
  await expect(dialog.getByRole("list", { name: "저장된 기록" })).toContainText("4.5 kg Revised")
  await dialog.getByRole("button", { name: "2026-10-09 (1)", exact: true }).click()
  await expect(dialog.getByRole("region", { name: "기록 달력" })).toContainText("Revised")
  await expect(dialog.locator(".growth-chart circle")).toHaveCount(1)
  await dialog.getByRole("button", { name: "이전 달", exact: true }).click()
  await dialog.getByRole("button", { name: "오늘로 이동", exact: true }).click()
  await page.keyboard.press("Escape")
  await page.reload()
  await page.getByRole("button", { name: "Edit Pet", exact: true }).click()
  await expect(dialog.getByRole("list", { name: "저장된 기록" })).toContainText("Revised")
  await dialog.getByRole("button", { name: "삭제 2026-10-09 Revised", exact: true }).click()
  await expect(dialog.locator(".growth-chart circle")).toHaveCount(0)
  await expect(dialog.getByRole("button", { name: "2026-10-09 (0)" })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Other Pet", exact: true }).click()
  await expect(page.getByRole("dialog").getByRole("list", { name: "저장된 기록" })).toContainText(
    "Unchanged",
  )
})
