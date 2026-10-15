import { accountClient, CloudError } from "../cloud/cloudApi"
import { prepareLocalBackup } from "../local/localContentBackup"
export async function exportCloudRecords(owner: string): Promise<Blob> {
  const client = await accountClient(owner)
  const ensured = await client.rpc("ensure_profile")
  if (ensured.error) throw new CloudError("account")
  async function rows(table: string) {
    const all: Record<string, unknown>[] = []
    for (let offset = 0; offset < 5000; offset += 250) {
      const result = await client
        .from(table)
        .select("*")
        .eq("owner_id", owner)
        .order("id")
        .range(offset, offset + 249)
      if (result.error || !Array.isArray(result.data)) throw new CloudError("request")
      all.push(...(result.data as Record<string, unknown>[]))
      if (result.data.length < 250) return all
    }
    throw new CloudError("quota")
  }
  const [pets, posts, growth, assets] = await Promise.all(
    ["pets", "posts", "growth_records", "media_assets"].map(rows),
  )
  if (!pets || !posts || !growth || !assets) throw new CloudError("request")
  const photos: { key: string; data: string }[] = []
  const activePosts = posts.filter(
    (post) => post["deleted_at"] === null && post["status"] === "published",
  )
  const needed = new Set(activePosts.map((post) => post["asset_id"]))
  let photoBytes = 0
  for (const id of needed) {
    const asset = assets.find((item) => item["id"] === id && item["status"] === "ready")
    if (!asset || typeof asset["display_key"] !== "string") throw new CloudError("image")
    const signed = await client.storage.from("pet-media").createSignedUrl(asset["display_key"], 60)
    if (signed.error) throw new CloudError("image")
    const response = await fetch(signed.data.signedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new CloudError("image")
    const blob = await response.blob()
    photoBytes += blob.size
    if (blob.size > 5 * 1024 * 1024 || photoBytes > 64 * 1024 * 1024) throw new CloudError("quota")
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result)
        else reject(new CloudError("image"))
      }
      reader.onerror = () => {
        reject(new CloudError("image"))
      }
      reader.readAsDataURL(blob)
    })
    photos.push({ key: "cloud-" + String(id), data })
  }
  const petId = (id: unknown) => "pet_cloud_" + String(id).replaceAll("-", "")
  const timestamp = (value: unknown) => new Date(String(value)).toISOString()
  const backup = {
    format: "ilove-pets-backup",
    version: 1,
    metadata: {
      schemaVersion: 1,
      pets: pets.map((pet) => ({
        id: petId(pet["id"]),
        name: pet["name"],
        category: pet["category"],
        breed: pet["breed"],
        createdAt: timestamp(pet["created_at"]),
        growth: growth
          .filter((record) => record["pet_id"] === pet["id"])
          .map((record) => ({
            id: "growth_" + String(record["id"]),
            date: record["record_date"],
            note: record["note"],
            ...(record["weight_kg"] === null ? {} : { weightKg: Number(record["weight_kg"]) }),
          })),
      })),
      posts: activePosts.map((post) => ({
        id: "post_cloud_" + String(post["id"]).replaceAll("-", ""),
        petId: petId(post["pet_id"]),
        photoKey: "cloud-" + String(post["asset_id"]),
        content: post["content"],
        tags: post["tags"],
        createdAt: timestamp(post["source_created_at"] ?? post["created_at"]),
      })),
    },
    photos,
  }
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" })
  await prepareLocalBackup(new File([blob], "cloud-backup.json", { type: "application/json" }))
  await accountClient(owner)
  return blob
}
export async function downloadCloudRecords(owner: string) {
  const blob = await exportCloudRecords(owner),
    url = URL.createObjectURL(blob),
    link = document.createElement("a")
  link.href = url
  link.download = `ilove-pets-cloud-records-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
