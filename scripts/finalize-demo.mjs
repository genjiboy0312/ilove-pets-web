import { readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { execFileSync, spawnSync } from "node:child_process"

// Use Playwright's bundled decoder; no extra package or remote upload.
const cache = "node_modules/playwright-core/.local-browsers"
const folder = (await readdir(cache)).find((name) => name.startsWith("ffmpeg-"))
if (!folder) throw new Error("Install Playwright Chromium and its bundled FFmpeg first")
const executables = await readdir(join(cache, folder))
const executable = executables.find((name) => /^ffmpeg-(win64\.exe|linux|mac)$/u.test(name))
if (!executable) throw new Error("Bundled FFmpeg executable unavailable")
const videos = []
for (const name of ["01-device-journal", "02-public-social", "03-safety-recovery"]) {
  const source = `${name}.webm`
  execFileSync(
    join(cache, folder, executable),
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      "8",
      "-i",
      `docs/demo/${source}`,
      "-frames:v",
      "1",
      "-update",
      "1",
      `docs/demo/${name}.png`,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  )
  // FFmpeg without an output intentionally exits nonzero after printing metadata.
  const probe = spawnSync(
    join(cache, folder, executable),
    ["-hide_banner", "-i", `docs/demo/${source}`],
    { encoding: "utf8" },
  )
  if (probe.error) throw probe.error
  const duration = probe.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/u)
  if (!duration || !probe.stderr.includes("390x844"))
    throw new Error(`Invalid video metadata: ${source}`)
  const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
  if (seconds < 10) throw new Error(`Video too short: ${source}`)
  videos.push({ source, width: 390, height: 844, duration_seconds: Number(seconds.toFixed(2)) })
}
await writeFile(
  "docs/demo/metadata.json",
  JSON.stringify(
    {
      checked_on: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()),
      decoder:
        "Playwright bundled FFmpeg decoded each VP8/WebM at 8 seconds into the companion 390x844 PNG poster.",
      videos,
    },
    null,
    2,
  ) + "\n",
)
console.log(`Decoded and prepared ${videos.length} demo clips`)
