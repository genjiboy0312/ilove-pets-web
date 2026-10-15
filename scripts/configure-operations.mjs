import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
function cli(args) {
  try {
    return execFileSync(
      process.platform === "win32" ? "cmd.exe" : "npx",
      process.platform === "win32"
        ? ["/d", "/s", "/c", ["npx", "--yes", "supabase", ...args].join(" ")]
        : ["--yes", "supabase", ...args],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 },
    )
  } catch {
    throw new Error("Supabase operation failed; details withheld to protect secret values")
  }
}
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
mkdirSync(".tmp", { recursive: true })
const dir = mkdtempSync(".tmp/ops-configuration-")
try {
  const secret = randomBytes(36).toString("hex")
  const envPath = join(dir, "maintenance.env"),
    sqlPath = join(dir, "schedule.sql")
  writeFileSync(envPath, "MAINTENANCE_SECRET=" + secret + "\n", { mode: 0o600 })
  cli(["secrets", "set", "--project-ref", ref, "--env-file", envPath])
  const template = readFileSync("supabase/operations/schedule.sql", "utf8")
  writeFileSync(
    sqlPath,
    template.replaceAll("__PROJECT_URL__", url.origin).replaceAll("__MAINTENANCE_SECRET__", secret),
    { mode: 0o600 },
  )
  cli(["db", "query", "--linked", "--project-ref", ref, "--file", sqlPath, "--output", "json"])
  console.log(
    JSON.stringify({ schedule: "configured", intervalMinutes: 15, secretsPrinted: false }),
  )
} finally {
  // The verified path was created by mkdtemp under the workspace .tmp directory.
  for (const name of ["maintenance.env", "schedule.sql"]) {
    try {
      unlinkSync(join(dir, name))
    } catch {
      /* The file may not have been created. */
    }
  }
  rmdirSync(dir)
}
