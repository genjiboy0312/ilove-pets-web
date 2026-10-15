export async function checked(operation) {
  const result = await operation
  if (result.error) throw new Error("operation_failed")
  return result.data
}
export async function runCleanup(admin, owner = null) {
  const jobs = await checked(admin.rpc("ops_claim_cleanup", { p_owner: owner }))
  let cleaned = 0,
    failed = 0
  for (const job of jobs) {
    let success = false
    try {
      const escaped = job.owner_id.replaceAll("-", "\\-")
      if (
        !new RegExp("^" + escaped + "/[0-9a-f-]{36}/(original|display\\.webp)$", "i").test(
          job.object_key,
        )
      )
        throw new Error("invalid_queue")
      await checked(admin.storage.from("pet-media").remove([job.object_key]))
      success = true
    } catch {
      /* Keep charges until both objects are confirmed removed; retry with backoff. */
    }
    await checked(
      admin.rpc("ops_finish_cleanup", {
        p_id: job.id,
        p_token: job.lease_token,
        p_success: success,
      }),
    )
    if (success) cleaned++
    else failed++
  }
  return { cleaned, failed }
}
export async function runMaintenance(admin) {
  const run = await checked(admin.from("operations_runs").insert({}).select("id").single())
  let cleaned = 0,
    failed = 0,
    deleted = 0
  try {
    await checked(admin.rpc("ops_prepare_cleanup"))
    const result = await runCleanup(admin)
    cleaned = result.cleaned
    failed = result.failed
    const jobs = await checked(admin.rpc("ops_claim_deletions"))
    for (const job of jobs) {
      let success = false
      try {
        // Queue state is necessary but not sufficient: inspect the entire owner prefix,
        // including untracked objects, before deleting Auth. Only UUID/known file keys are used.
        const folders = await checked(
          admin.storage.from("pet-media").list(job.owner_id, { limit: 1000 }),
        )
        if (folders.length) {
          // Legitimate keys use owner/asset/{original,display.webp}; remove bounded batches.
          const keys = []
          for (const folder of folders.slice(0, 20)) {
            if (!/^[0-9a-f-]{36}$/i.test(folder.name)) throw new Error("unexpected_object")
            const objects = await checked(
              admin.storage
                .from("pet-media")
                .list(job.owner_id + "/" + folder.name, { limit: 100 }),
            )
            for (const object of objects) {
              if (!["original", "display.webp"].includes(object.name))
                throw new Error("unexpected_object")
              keys.push(job.owner_id + "/" + folder.name + "/" + object.name)
            }
          }
          if (keys.length) await checked(admin.storage.from("pet-media").remove(keys))
          const remaining = await checked(
            admin.storage.from("pet-media").list(job.owner_id, { limit: 1 }),
          )
          if (remaining.length) throw new Error("remaining_objects")
        }
        const removed = await admin.auth.admin.deleteUser(job.owner_id)
        if (removed.error && removed.error.status !== 404) throw new Error("delete_failed")
        success = true
        deleted++
      } catch {
        failed++
      }
      await checked(
        admin.rpc("ops_finish_deletion", {
          p_id: job.id,
          p_token: job.lease_token,
          p_success: success,
        }),
      )
    }
  } catch {
    failed++
  }
  await checked(
    admin
      .from("operations_runs")
      .update({ completed_at: new Date().toISOString(), cleaned, failed })
      .eq("id", run.id),
  )
  return { cleaned, failed, deleted }
}
