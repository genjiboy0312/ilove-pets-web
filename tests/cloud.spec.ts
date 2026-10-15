import { expect, test } from "@playwright/test"

const owner = "00000000-0000-0000-0000-000000000001"

test("private cloud pet, growth and photo post survive reload, edits and deletion", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.metadata["authConfigured"] !== true,
    "Needs a build with public auth configuration; all backend traffic is mocked.",
  )
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas")
      canvas.width = 32
      canvas.height = 24
      const context = canvas.getContext("2d")
      if (!context) throw new Error("canvas unavailable")
      context.fillStyle = "#e3a542"
      context.fillRect(0, 0, 32, 24)
      return canvas.toDataURL("image/png").split(",")[1] ?? ""
    }),
    "base64",
  )
  const pets: Record<string, unknown>[] = [],
    growth: Record<string, unknown>[] = [],
    posts: Record<string, unknown>[] = [],
    assets: Record<string, unknown>[] = []
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url())
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
      })
    if (url.pathname === "/auth/v1/user")
      return json({
        id: owner,
        email: "portfolio@example.com",
        aud: "authenticated",
        email_confirmed_at: "2026-10-15T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-10-15T00:00:00Z",
      })
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const args = request.postDataJSON() as Record<string, unknown>,
        name = url.pathname.split("/").at(-1)
      if (name === "ensure_profile") return json({ id: owner })
      if (name === "cloud_version") return json(2)
      if (name === "save_pet") {
        const row = pets.find((row) => row["id"] === args["p_id"])
        const changes = {
          id: args["p_id"],
          owner_id: owner,
          name: args["p_name"],
          breed: args["p_breed"],
          category: args["p_category"],
          version: row ? Number(row["version"]) + 1 : 1,
        }
        if (row) Object.assign(row, changes)
        else pets.push(changes)
        return json(changes)
      }
      if (name === "upsert_growth_record") {
        const row = growth.find((row) => row["id"] === args["p_id"])
        const changes = {
          id: args["p_id"],
          owner_id: owner,
          pet_id: args["p_pet_id"],
          record_date: args["p_record_date"],
          weight_kg: args["p_weight_kg"],
          note: args["p_note"],
          version: row ? Number(row["version"]) + 1 : 1,
        }
        if (row) Object.assign(row, changes)
        else growth.push(changes)
        return json(changes)
      }
      if (name === "reserve_media") {
        const asset = {
          id: "40000000-0000-0000-0000-000000000001",
          owner_id: owner,
          object_key: owner + "/40000000-0000-0000-0000-000000000001/original",
          display_key: null,
          reserved_bytes: 10485760,
          status: "reserved",
        }
        assets.push(asset)
        return json(asset)
      }
      if (name === "save_private_post") {
        const row = posts.find((row) => row["id"] === args["p_id"])
        const changes = {
          id: args["p_id"],
          owner_id: owner,
          pet_id: args["p_pet_id"],
          asset_id: args["p_asset_id"],
          content: args["p_content"],
          version: row ? Number(row["version"]) + 1 : 1,
        }
        if (row) Object.assign(row, changes)
        else posts.push(changes)
        return json(changes)
      }
      const target = name === "delete_pet" ? pets : name === "delete_growth_record" ? growth : posts
      const index = target.findIndex((row) => row["id"] === args["p_id"])
      if (index >= 0) target.splice(index, 1)
      if (name === "delete_private_post") for (const asset of assets) asset["status"] = "deleting"
      return json(null)
    }
    if (url.pathname === "/functions/v1/cloud-media") {
      const args = request.postDataJSON() as Record<string, unknown>
      expect(request.headers()["authorization"]).toMatch(/^Bearer /)
      if (args["action"] === "status") return json({ ready: true })
      if (args["action"] === "finalize")
        for (const asset of assets) {
          asset["status"] = "ready"
          asset["display_key"] = owner + "/" + String(asset["id"]) + "/display.webp"
        }
      else
        for (const asset of assets) {
          asset["status"] = "deleted"
          asset["reserved_bytes"] = 0
        }
      return json({ assetId: args["assetId"] })
    }
    if (url.pathname.startsWith("/storage/v1/object/sign/") && request.method() === "POST")
      return json({ signedURL: "/object/sign/pet-media/test.webp?token=test" })
    if (url.pathname.startsWith("/storage/v1/object/sign/"))
      return route.fulfill({ contentType: "image/png", body: png })
    if (url.pathname.startsWith("/storage/v1/object/")) return json({ Key: "pet-media/test" })
    const table = url.pathname.split("/").at(-1)
    return json(
      table === "pets"
        ? pets
        : table === "growth_records"
          ? growth
          : table === "posts"
            ? posts
            : assets,
    )
  })
  await page.addInitScript(
    ({ owner }) => {
      localStorage.setItem("i18nextLng", "ko")
      const exp = Math.floor(Date.now() / 1000) + 3600
      const jwt =
        btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) +
        "." +
        btoa(JSON.stringify({ sub: owner, exp, role: "authenticated", aud: "authenticated" })) +
        ".test"
      localStorage.setItem(
        "ilove-pets-auth",
        JSON.stringify({
          access_token: jwt,
          refresh_token: "test",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: exp,
          user: {
            id: owner,
            aud: "authenticated",
            email: "portfolio@example.com",
            email_confirmed_at: "2026-10-15",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-10-15",
          },
        }),
      )
    },
    { owner },
  )
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/cloud")
  const petsRegion = page.getByRole("region", { name: "클라우드 펫" })
  await petsRegion.getByLabel("펫 이름").fill("구름이")
  await petsRegion.getByLabel("품종").fill("믹스")
  await petsRegion.getByRole("button", { name: "클라우드에 저장" }).click()
  await expect(petsRegion.locator("strong")).toHaveText("구름이")
  const growthRegion = page.getByRole("region", { name: "성장 기록" })
  await growthRegion.getByLabel("체중 (kg, 선택)").fill("3.2")
  await growthRegion.getByLabel("돌봄 메모").fill("산책 완료")
  await growthRegion.getByRole("button", { name: "클라우드에 저장" }).click()
  await expect(growthRegion).toContainText("3.2 kg")
  const postsRegion = page.getByRole("region", { name: "클라우드 게시물" })
  await postsRegion
    .getByLabel(/사진 \(/)
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png })
  await postsRegion.getByLabel("게시물 본문").fill("비공개 일상")
  await postsRegion.getByRole("button", { name: "클라우드에 저장" }).click()
  await expect(postsRegion.locator(".cloud-post__text")).toHaveText("비공개 일상")
  await expect(postsRegion.getByRole("img")).toBeVisible()
  await page.reload()
  await expect(petsRegion.locator("strong")).toHaveText("구름이")
  await expect(postsRegion.locator(".cloud-post__text")).toHaveText("비공개 일상")
  await growthRegion.getByRole("button", { name: "수정", exact: true }).click()
  await growthRegion.getByLabel("돌봄 메모").fill("수정한 기록")
  await growthRegion.getByRole("button", { name: "클라우드에 저장" }).click()
  await expect(growthRegion.locator(".cloud-post__text")).toHaveText("수정한 기록")
  await expect(page.getByRole("alert")).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "test-results/cloud-private-mobile.png", fullPage: true })
  for (const region of [postsRegion, growthRegion, petsRegion]) {
    await region.getByRole("button", { name: "삭제", exact: true }).click()
    await region.getByRole("button", { name: "삭제 확정", exact: true }).click()
    await expect(region.locator("li")).toHaveCount(0)
  }
})
