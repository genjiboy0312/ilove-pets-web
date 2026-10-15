import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import {
  loadRuntimeWasm,
  runtimeBytes,
  runtimeKey,
  runtimeBucket,
} from "../../supabase/functions/_shared/runtimeAsset.mjs"

test("loads only the fixed private runtime path and verifies exact binary integrity", async () => {
  const bytes = await readFile(
    fileURLToPath(import.meta.resolve("@imagemagick/magick-wasm/magick.wasm")),
  )
  const loaded = await loadRuntimeWasm(
    "https://project.supabase.co",
    "test-service-key",
    (url, options) => {
      assert.equal(
        url.href,
        `https://project.supabase.co/storage/v1/object/authenticated/${runtimeBucket}/${runtimeKey}`,
      )
      assert.equal(options.headers.Authorization, "Bearer test-service-key")
      return Promise.resolve(new Response(bytes))
    },
  )
  assert.equal(loaded.length, runtimeBytes)
})
test("rejects unavailable, truncated, oversized and modified runtime bytes", async () => {
  for (const response of [
    new Response(null, { status: 403 }),
    new Response(new Uint8Array(4)),
    new Response(new Uint8Array(runtimeBytes + 1)),
    new Response(new Uint8Array(runtimeBytes)),
  ]) {
    await assert.rejects(
      loadRuntimeWasm("https://project.supabase.co", "test", () => Promise.resolve(response)),
    )
  }
})
