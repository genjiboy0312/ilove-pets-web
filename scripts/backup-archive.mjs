import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto"
export const backupTables = [
  "auth.users",
  "auth.identities",
  "public.profiles",
  "public.pets",
  "public.media_assets",
  "public.growth_records",
  "public.posts",
  "public.follows",
  "public.post_comments",
  "public.post_likes",
  "public.stories",
  "public.story_views",
  "public.local_import_items",
  "public.notifications",
  "public.user_blocks",
  "public.content_reports",
  "public.moderation_targets",
  "public.cleanup_jobs",
  "public.account_deletion_jobs",
  "public.operations_runs",
]
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex")
export function encrypt(bytes, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    data = Buffer.concat([cipher.update(bytes), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data])
}
export function decrypt(bytes, key) {
  if (bytes.length < 28) throw new Error("Invalid archive")
  const cipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12))
  cipher.setAuthTag(bytes.subarray(12, 28))
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()])
}
const literal = (value) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb"
const authTokenFields = new Set([
  "confirmation_token",
  "recovery_token",
  "email_change_token_new",
  "email_change_token_current",
  "phone_change_token",
  "reauthentication_token",
])
export function restoreSql(snapshot) {
  if (!snapshot || backupTables.some((table) => !Array.isArray(snapshot[table])))
    throw new Error("Incomplete snapshot")
  const statements = [
    "begin;",
    `lock table ${backupTables.join(",")} in access exclusive mode;`,
    `do $$ begin if (${backupTables.map((table) => `(select count(*) from ${table})`).join("+")})<>0 then raise exception 'restore_target_not_empty'; end if; end; $$;`,
  ]
  for (const table of backupTables.filter((name) => name.startsWith("public.")))
    statements.push(`alter table ${table} disable trigger user;`)
  for (const table of backupTables) {
    let rows = snapshot[table]
    if (table === "public.profiles") rows = rows.map((row) => ({ ...row, avatar_asset_id: null }))
    if (table === "public.cleanup_jobs")
      rows = rows.map((row) => ({
        next_attempt_at: row.created_at,
        lease_until: null,
        lease_token: null,
        ...row,
      }))
    if (table === "auth.users")
      rows = rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, authTokenFields.has(key) ? "" : value]),
        ),
      )
    statements.push(
      `insert into ${table} select * from jsonb_populate_recordset(null::${table},${literal(rows)});`,
    )
  }
  statements.push(
    `update public.profiles p set avatar_asset_id=s.avatar_asset_id from jsonb_populate_recordset(null::public.profiles,${literal(snapshot["public.profiles"])}) s where p.id=s.id;`,
  )
  for (const table of backupTables.filter((name) => name.startsWith("public.")))
    statements.push(`alter table ${table} enable trigger user;`)
  statements.push("commit;")
  return statements.join("\n")
}
