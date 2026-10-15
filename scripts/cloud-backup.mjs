import { createClient } from "@supabase/supabase-js"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, join } from "node:path"
import { randomBytes, randomUUID } from "node:crypto"
import { publicProject, serviceKey, queryProject } from "./operations-client.mjs"
import { backupTables, encrypt, decrypt, sha256, restoreSql } from "./backup-archive.mjs"
const args = process.argv.slice(2),
  project = publicProject(),
  root = resolve(".backups")
mkdirSync(root, { recursive: true })
const keyPath = join(root, "recovery.key")
if (!existsSync(keyPath) && args[0] !== "create") throw new Error("Recovery key is missing")
if (!existsSync(keyPath))
  writeFileSync(keyPath, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" })
const key = Buffer.from(readFileSync(keyPath, "utf8").trim(), "hex")
if (key.length !== 32) throw new Error("Invalid recovery key")
function admin(ref) {
  return createClient(`https://${ref}.supabase.co`, serviceKey(ref), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
async function checked(result) {
  const value = await result
  if (value.error) throw new Error("Backup storage operation failed")
  return value.data
}
function load(directory) {
  const path = resolve(directory),
    manifest = JSON.parse(readFileSync(join(path, "manifest.json"), "utf8"))
  if (
    manifest.format !== "ilove-pets-operations-backup" ||
    manifest.version !== 1 ||
    !/^[a-z0-9]{20}$/.test(manifest.project)
  )
    throw new Error("Unsupported backup")
  const snapshot = JSON.parse(decrypt(readFileSync(join(path, "database.enc")), key))
  if (sha256(Buffer.from(JSON.stringify(snapshot))) !== manifest.databaseHash)
    throw new Error("Snapshot integrity failed")
  for (const item of manifest.objects) {
    if (
      !/^[0-9]{6}\.enc$/.test(item.file) ||
      !/^([0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})\/([0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})\/(original|display\.webp)$/i.test(
        item.key,
      )
    )
      throw new Error("Invalid object manifest")
    const bytes = decrypt(readFileSync(join(path, item.file)), key)
    if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256)
      throw new Error("Photo integrity failed")
  }
  restoreSql(snapshot)
  return { path, manifest, snapshot }
}
if (args[0] === "create") {
  if (
    queryProject(project.ref, "select count(*)::integer as count from auth.mfa_factors;")[0].count >
    0
  )
    throw new Error(
      "MFA-enabled projects require a full platform backup; this portfolio snapshot does not export MFA secrets",
    )
  const existingTables = new Set(
    queryProject(
      project.ref,
      "select schemaname||'.'||tablename as name from pg_tables where schemaname in ('public','auth');",
    ).map((row) => row.name),
  )
  const query =
    "select jsonb_build_object(" +
    backupTables
      .map((table) =>
        existingTables.has(table)
          ? `'${table}',coalesce((select jsonb_agg(to_jsonb(t)) from ${table} t),'[]'::jsonb)`
          : `'${table}','[]'::jsonb`,
      )
      .join(",") +
    ") as snapshot;"
  const snapshot = queryProject(project.ref, query)[0].snapshot
  const directory = join(
    root,
    new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID().slice(0, 8),
  )
  mkdirSync(directory)
  const bytes = Buffer.from(JSON.stringify(snapshot))
  writeFileSync(join(directory, "database.enc"), encrypt(bytes, key), { mode: 0o600 })
  const client = admin(project.ref),
    objects = []
  const assets = snapshot["public.media_assets"]
  for (const asset of assets) {
    if (!["ready", "processing", "reserved"].includes(asset.status)) continue
    for (const name of [asset.object_key, asset.display_key].filter(Boolean)) {
      if (objects.some((item) => item.key === name)) continue
      const response = await client.storage.from("pet-media").download(name)
      if (response.error) {
        if (asset.status === "ready")
          throw new Error("Ready photo missing; snapshot remains incomplete")
        continue
      }
      const data = Buffer.from(await response.data.arrayBuffer()),
        file = String(objects.length).padStart(6, "0") + ".enc"
      writeFileSync(join(directory, file), encrypt(data, key), { mode: 0o600 })
      objects.push({
        key: name,
        file,
        bytes: data.length,
        sha256: sha256(data),
        contentType: name.endsWith(".webp") ? "image/webp" : asset.mime_type,
      })
    }
  }
  const manifest = {
    format: "ilove-pets-operations-backup",
    version: 1,
    project: project.ref,
    createdAt: new Date().toISOString(),
    databaseHash: sha256(bytes),
    objects,
  }
  writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), {
    mode: 0o600,
    flag: "wx",
  })
  load(directory)
  console.log(
    JSON.stringify({
      backup: directory,
      encrypted: true,
      photos: objects.length,
      verified: true,
      recoveryKeyFile: keyPath,
    }),
  )
} else if (args[0] === "verify") {
  const result = load(args[1])
  console.log(JSON.stringify({ verified: true, photos: result.manifest.objects.length }))
} else if (args[0] === "restore") {
  const target = args[3]
  if (
    args[2] !== "--target" ||
    args[4] !== "--confirm-target" ||
    args[5] !== target ||
    !/^[a-z0-9]{20}$/.test(target ?? "")
  )
    throw new Error("Restore needs --target REF --confirm-target REF")
  const { path, manifest, snapshot } = load(args[1])
  if (target === manifest.project || target === project.ref)
    throw new Error("Refusing restore to the source project")
  if (
    !Number.isFinite(Date.parse(manifest.createdAt)) ||
    Date.parse(manifest.createdAt) > Date.now() + 30000 ||
    Date.now() - Date.parse(manifest.createdAt) > 30 * 86400000
  )
    throw new Error("Snapshot older than 30 days; review deletion tombstones manually")
  const newerDeletions = queryProject(
    manifest.project,
    "select count(*) as count from public.account_deletion_jobs where requested_at>'" +
      new Date(manifest.createdAt).toISOString() +
      "'::timestamptz;",
  )[0].count
  if (Number(newerDeletions) > 0)
    throw new Error(
      "Deletion requests occurred after this backup. Reconcile them before any restore.",
    )
  const empty = queryProject(
    target,
    "select " +
      backupTables.map((table) => `(select count(*) from ${table})`).join("+") +
      " as count;",
  )[0].count
  if (Number(empty) !== 0)
    throw new Error("Restore target must have migrations applied and contain no users or app rows")
  // This tool restores into an isolated empty project for verification. Keep it disconnected
  // from the public frontend until deletion requests since the backup have been reconciled.
  const client = admin(target)
  for (const object of manifest.objects) {
    const bytes = decrypt(readFileSync(join(path, object.file)), key)
    const existing = await client.storage.from("pet-media").download(object.key)
    if (existing.data) {
      if (sha256(Buffer.from(await existing.data.arrayBuffer())) !== object.sha256)
        throw new Error("Conflicting existing target object")
    } else
      await checked(
        client.storage
          .from("pet-media")
          .upload(object.key, bytes, { contentType: object.contentType, upsert: false }),
      )
  }
  queryProject(target, restoreSql(snapshot))
  console.log(
    JSON.stringify({
      restored: true,
      target,
      photos: manifest.objects.length,
      requiresIsolatedVerification: true,
    }),
  )
} else
  throw new Error(
    "Usage: node scripts/cloud-backup.mjs create | verify DIRECTORY | restore DIRECTORY --target REF --confirm-target REF",
  )
