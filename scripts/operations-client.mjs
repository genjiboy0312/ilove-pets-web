import { execFileSync } from "node:child_process"
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync, mkdirSync } from "node:fs"
import { join, resolve } from "node:path"
export function supabaseCli(args) {
  try {
    return execFileSync(
      process.platform === "win32" ? "cmd.exe" : "npx",
      process.platform === "win32"
        ? ["/d", "/s", "/c", ["npx", "--yes", "supabase", ...args].join(" ")]
        : ["--yes", "supabase", ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180000,
        maxBuffer: 128 * 1024 * 1024,
      },
    )
  } catch {
    throw new Error(
      "Supabase command failed. Raw output withheld because it may include private values.",
    )
  }
}
export function publicProject() {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("="))
      .map((line) => {
        const i = line.indexOf("=")
        return [line.slice(0, i), line.slice(i + 1).trim()]
      }),
  )
  const url = new URL(env.VITE_SUPABASE_URL),
    ref = url.hostname.split(".")[0]
  if (url.origin !== `https://${ref}.supabase.co` || !/^[a-z0-9]{20}$/.test(ref))
    throw new Error("Invalid project URL")
  return { url: url.origin, ref }
}
export function queryProject(ref, sql) {
  if (!/^[a-z0-9]{20}$/.test(ref)) throw new Error("Invalid project ref")
  mkdirSync(".tmp", { recursive: true })
  const dir = mkdtempSync(resolve(".tmp", "ops-query-")),
    file = join(dir, "query.sql")
  try {
    writeFileSync(file, sql, { mode: 0o600 })
    // A quoted file path is needed when the workspace path has spaces on Windows.
    const output = supabaseCli([
      "db",
      "query",
      "--linked",
      "--project-ref",
      ref,
      "--file",
      process.platform === "win32" ? '"' + file + '"' : file,
      "--output",
      "json",
    ])
    const data = JSON.parse(output.slice(output.indexOf("{")))
    return data.rows ?? []
  } finally {
    unlinkSync(file)
    rmdirSync(dir)
  }
}
export function serviceKey(ref) {
  const keys = JSON.parse(
    supabaseCli(["projects", "api-keys", "--project-ref", ref, "--output", "json"]).replace(
      /^\uFEFF/,
      "",
    ),
  )
  const key = keys.find(
    (value) => value.name === "service_role" || value.id === "service_role",
  )?.api_key
  if (typeof key !== "string") throw new Error("Service credential unavailable")
  return key
}
