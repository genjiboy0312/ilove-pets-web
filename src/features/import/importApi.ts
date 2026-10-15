import { accountClient, CloudError, cloudMutation, uploadCloudImage } from "../cloud/cloudApi"
import { exportLocalBackup, prepareLocalBackup } from "../local/localContentBackup"
import type { PreparedBackup } from "../local/localContentBackup"

export interface ImportItem {
  kind: "pet" | "growth" | "post"
  source: string
  petSource: string
  label: string
  payload: Record<string, unknown>
  photo: Blob | undefined
}
export interface ImportReceipt {
  id: string
  kind: string
  source_id: string
  target_id: string
  asset_id: string | null
  pet_id: string | null
  completed_at: string | null
  payload: Record<string, unknown>
}
export function importItems(backup: PreparedBackup): ImportItem[] {
  return [
    ...backup.metadata.pets.map((p) => ({
      kind: "pet" as const,
      source: p.id,
      petSource: p.id,
      label: p.name,
      payload: { name: p.name, category: p.category, breed: p.breed, createdAt: p.createdAt },
      photo: p.photoKey ? backup.photos.get(p.photoKey) : undefined,
    })),
    ...backup.metadata.pets.flatMap((p) =>
      (p.growth ?? []).map((g) => ({
        kind: "growth" as const,
        source: `${p.id}/${g.id}`,
        petSource: p.id,
        label: `${p.name} · ${g.date}`,
        payload: { date: g.date, weightKg: g.weightKg ?? null, note: g.note },
        photo: undefined,
      })),
    ),
    ...backup.metadata.posts.map((p) => ({
      kind: "post" as const,
      source: p.id,
      petSource: p.petId,
      label: p.content,
      payload: {
        content: p.content,
        tags: p.tags,
        createdAt: p.createdAt,
        comments: p.comments ?? [],
        liked: p.liked ?? false,
      },
      photo: backup.photos.get(p.photoKey),
    })),
  ]
}
export async function deviceImport(): Promise<PreparedBackup> {
  return prepareLocalBackup(
    new File([await exportLocalBackup()], "device.json", { type: "application/json" }),
  )
}
export async function importHistory(
  owner: string,
  before?: string,
  pending = false,
): Promise<ImportReceipt[]> {
  const result = await (
    await accountClient(owner)
  ).rpc("local_import_history", { p_before: before ?? null, p_pending: pending })
  if (result.error || !Array.isArray(result.data)) throw new CloudError("request")
  return (result.data as unknown[]).map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new CloudError("request")
    const r = value as Record<string, unknown>
    if (
      typeof r["id"] !== "string" ||
      typeof r["source_id"] !== "string" ||
      typeof r["kind"] !== "string" ||
      typeof r["target_id"] !== "string" ||
      !r["payload"] ||
      typeof r["payload"] !== "object" ||
      Array.isArray(r["payload"])
    )
      throw new CloudError("request")
    return {
      id: r["id"],
      kind: r["kind"],
      source_id: r["source_id"],
      target_id: r["target_id"],
      payload: r["payload"] as Record<string, unknown>,
      asset_id: typeof r["asset_id"] === "string" ? r["asset_id"] : null,
      pet_id: typeof r["pet_id"] === "string" ? r["pet_id"] : null,
      completed_at: typeof r["completed_at"] === "string" ? r["completed_at"] : null,
    }
  })
}
export async function allImportReceipts(owner: string): Promise<ImportReceipt[]> {
  const rows: ImportReceipt[] = []
  for (let page = 0; page < 50; page++) {
    const next = await importHistory(owner, rows.at(-1)?.id, true)
    rows.push(...next)
    if (next.length < 100) return rows
  }
  return rows
}
export async function importOne(
  owner: string,
  item: ImportItem,
  pet: string | null,
  check: () => void,
): Promise<string> {
  check()
  const photoHash = item.photo
    ? Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", await item.photo.arrayBuffer())),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
    : null
  check()
  const prepared = await (
    await accountClient(owner)
  ).rpc("prepare_local_import", {
    p_kind: item.kind,
    p_source: item.source,
    p_payload: item.payload,
    p_photo_hash: photoHash,
    p_pet: pet,
  })
  if (prepared.error)
    throw new CloudError(
      prepared.error.code === "PT409"
        ? "conflict"
        : prepared.error.code === "54000"
          ? "quota"
          : "request",
    )
  const receipt = prepared.data as ImportReceipt
  check()
  if (receipt.completed_at) return receipt.target_id
  if (item.photo) {
    let asset = receipt.asset_id
    if (asset) {
      const result = await (
        await accountClient(owner)
      )
        .from("media_assets")
        .select("status")
        .eq("id", asset)
        .single()
      if (result.error || result.data.status !== "ready") asset = null
    }
    if (!asset) {
      check()
      asset = await uploadCloudImage(
        owner,
        new File([item.photo], "import-photo", { type: item.photo.type }),
        item.kind === "pet" ? "pet_avatar" : "post_photo",
      )
      check()
      await cloudMutation(owner, "attach_local_import_media", { p_id: receipt.id, p_asset: asset })
    }
  }
  check()
  await cloudMutation(owner, "finish_local_import", { p_id: receipt.id })
  check()
  return receipt.target_id
}
