import { readMetadata, writeMetadata } from "./localContentMetadata"
import type { StoredMetadata } from "./localContentMetadata"

interface NavigatorWithLocks {
  readonly locks?: {
    readonly request: <T>(name: string, callback: () => T | Promise<T>) => Promise<T>
  }
}

let fallbackQueue: Promise<unknown> = Promise.resolve()

const metadataLockName = "ilove-pets-local-content-metadata"

export async function commitMetadata(
  update: (metadata: StoredMetadata) => StoredMetadata | Promise<StoredMetadata>,
): Promise<void> {
  await withMetadataLock(async () => {
    writeMetadata(await update(readMetadata()))
  })
}

export async function withMetadataLock<T>(runCommit: () => T | Promise<T>): Promise<T> {
  const locks = (navigator as NavigatorWithLocks).locks

  if (locks === undefined) {
    const result = fallbackQueue.then(runCommit)
    fallbackQueue = result.catch(() => undefined)
    return await result
  }

  return await locks.request(metadataLockName, runCommit)
}
