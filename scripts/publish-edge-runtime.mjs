import { readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  runtimeBucket,
  runtimeKey,
  runtimeHash,
  runtimeBytes,
} from "../supabase/functions/_shared/runtimeAsset.mjs"

// Privileged credentials stay in process memory and are never printed or persisted.
const env = Object.fromEntries(
  (await readFile(new URL("../.env.local", import.meta.url), "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf("=")
      return [line.slice(0, i), line.slice(i + 1)]
    }),
)
const url = new URL(env.VITE_SUPABASE_URL)
const project = url.hostname.split(".")[0]
if (
  url.protocol !== "https:" ||
  url.hostname !== `${project}.supabase.co` ||
  !project ||
  !/^[a-z0-9]{20}$/.test(project)
)
  throw new Error("Invalid project URL")
let keys
try {
  const args = [
    "--yes",
    "supabase",
    "projects",
    "api-keys",
    "--project-ref",
    project,
    "--output",
    "json",
  ]
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 }
  const result =
    process.platform === "win32"
      ? execFileSync("cmd.exe", ["/d", "/s", "/c", ["npx", ...args].join(" ")], options)
      : execFileSync("npx", args, options)
  keys = JSON.parse(result.replace(/^\uFEFF/, ""))
} catch {
  throw new Error("Supabase CLI key lookup failed; run supabase login and retry")
}
const serviceKey = keys.find(
  (key) => key.name === "service_role" || key.id === "service_role",
)?.api_key
if (typeof serviceKey !== "string") throw new Error("Project service credential unavailable")
const bytes = await readFile(
  new URL("../supabase/functions/cloud-media/magick.wasm", import.meta.url),
)
if (
  bytes.length !== runtimeBytes ||
  createHash("sha256").update(bytes).digest("hex") !== runtimeHash
)
  throw new Error("Installed WASM does not match the pinned binary")
const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
async function api(path, options = {}) {
  return fetch(new URL(path, url), {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(90000),
  })
}
let bucket = await api(`/storage/v1/bucket/${runtimeBucket}`)
let missing = bucket.status === 404
if (!bucket.ok && bucket.status === 400) {
  const failure = await bucket.json()
  missing = failure.message === "Bucket not found" || failure.code === "NoSuchBucket"
}
if (missing) {
  const created = await api("/storage/v1/bucket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: runtimeBucket,
      name: runtimeBucket,
      public: false,
      file_size_limit: 20971520,
      allowed_mime_types: ["application/wasm"],
    }),
  })
  if (!created.ok) throw new Error(`Runtime bucket creation failed (${created.status})`)
  bucket = await api(`/storage/v1/bucket/${runtimeBucket}`)
}
if (!bucket.ok) throw new Error(`Runtime bucket lookup failed (${bucket.status})`)
const info = await bucket.json()
if (info.public !== false)
  throw new Error("Runtime bucket must be private; existing bucket was not changed")
const upload = await api(`/storage/v1/object/${runtimeBucket}/${runtimeKey}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/wasm",
    "Cache-Control": "max-age=31536000",
    "x-upsert": "false",
  },
  body: bytes,
})
if (!upload.ok) {
  const result = await upload.json()
  if (upload.status !== 409 && result.statusCode !== "409" && result.error !== "Duplicate")
    throw new Error(`Runtime upload failed (${upload.status})`)
}
const verify = await api(`/storage/v1/object/authenticated/${runtimeBucket}/${runtimeKey}`)
if (!verify.ok) throw new Error(`Runtime verification failed (${verify.status})`)
const verified = Buffer.from(await verify.arrayBuffer())
if (createHash("sha256").update(verified).digest("hex") !== runtimeHash)
  throw new Error("Uploaded runtime integrity check failed")
console.log(
  JSON.stringify({
    runtimePublished: true,
    project,
    bucket: runtimeBucket,
    private: true,
    bytes: runtimeBytes,
    integrityVerified: true,
  }),
)
