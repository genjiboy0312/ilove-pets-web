import { readFile, readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"

const args = process.argv.slice(2)
const baselineDir = args[0]
if (!baselineDir)
  throw new Error("Usage: node scripts/measure-bundle.mjs BASELINE_DIST BASELINE_REF")
const baselineRef = args[1] ?? "main"
const ref = (name) =>
  execFileSync("git", ["rev-parse", "--verify", name], { encoding: "utf8" }).trim()

async function measure(directory) {
  const html = await readFile(join(directory, "index.html"), "utf8")
  const entry = html.match(/<script[^>]+src="\/?([^"]+\.js)"/u)?.[1]
  if (!entry) throw new Error("Missing production JS entry")
  const files = await Promise.all(
    (await readdir(join(directory, "assets")))
      .filter((name) => name.endsWith(".js"))
      .map(async (name) => {
        const buffer = await readFile(join(directory, "assets", name))
        return { file: `assets/${name}`, bytes: buffer.length, gzip_bytes: gzipSync(buffer).length }
      }),
  )
  const entryFile = files.find((file) => file.file === entry)
  if (!entryFile) throw new Error("Entry file unavailable")
  return {
    entry: entryFile,
    largest_chunk: files.toSorted((a, b) => b.bytes - a.bytes)[0],
    all_route_js_file_count: files.length,
    all_route_js_bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  }
}

const baseline = await measure(baselineDir),
  current = await measure("dist")
const result = {
  measured_on: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()),
  node: process.version,
  package_lock_sha256: createHash("sha256")
    .update(await readFile("package-lock.json"))
    .digest("hex"),
  baseline_commit: ref(baselineRef),
  current_base_commit: ref("HEAD"),
  source_note:
    "Current includes S5 and portfolio working changes; baseline is main archived into a temporary folder. Both use the current installed dependencies and same public VITE auth values. This is not an isolated lazy-loading-only experiment.",
  method:
    "Vite production build. Exact file bytes and Node gzipSync default. Asset sizes exclude HTML/CSS/photos and are not initial request totals, LCP or real-device timings.",
  baseline,
  current,
  entry_file_reduction_percent: Number(
    ((1 - current.entry.bytes / baseline.entry.bytes) * 100).toFixed(2),
  ),
}
await writeFile("docs/bundle-measurements.json", JSON.stringify(result, null, 2) + "\n")
console.log(JSON.stringify(result, null, 2))
