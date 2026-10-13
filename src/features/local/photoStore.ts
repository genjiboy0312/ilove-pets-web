import { LocalContentStorageError } from "./localContentErrors"

const databaseName = "ilove-pets-local-content"
const photoStoreName = "photos"
const databaseVersion = 1

export async function putPhoto(key: string, blob: Blob): Promise<void> {
  const database = await openDatabase()

  try {
    await runPhotoTransaction(database, "readwrite", (store) => store.put(blob, key))
  } finally {
    database.close()
  }
}

export async function getPhoto(key: string): Promise<Blob | null> {
  const database = await openDatabase()

  try {
    const result = await runPhotoTransaction(database, "readonly", (store) => store.get(key))
    return result instanceof Blob ? result : null
  } finally {
    database.close()
  }
}

export async function deletePhoto(key: string): Promise<void> {
  const database = await openDatabase()

  try {
    await runPhotoTransaction(database, "readwrite", (store) => store.delete(key))
  } finally {
    database.close()
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) {
    return Promise.reject(
      new LocalContentStorageError("IndexedDB is not available in this browser."),
    )
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(photoStoreName)
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(new LocalContentStorageError("Local photo storage could not be opened."))
    }
  })
}

function runPhotoTransaction(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(photoStoreName, mode)
    const request = operation(transaction.objectStore(photoStoreName))
    let result: unknown
    let settled = false

    request.onsuccess = () => {
      result = request.result
    }
    request.onerror = () => {
      settled = true
      reject(
        new LocalContentStorageError(
          "Local photo storage failed. Try clearing site data and reselecting the photo.",
        ),
      )
    }
    transaction.oncomplete = () => {
      if (!settled) {
        settled = true
        resolve(result)
      }
    }
    transaction.onabort = () => {
      if (!settled) {
        settled = true
        reject(new LocalContentStorageError("Local photo storage transaction was aborted."))
      }
    }
    transaction.onerror = () => {
      if (!settled) {
        settled = true
        reject(new LocalContentStorageError("Local photo storage transaction failed."))
      }
    }
  })
}

export async function clearPhotos(): Promise<void> {
  const database = await openDatabase()
  try {
    await runPhotoTransaction(database, "readwrite", (store) => store.clear())
  } finally {
    database.close()
  }
}

// One transaction prevents partial photo batches during backup restoration.
export async function putPhotos(photos: ReadonlyMap<string, Blob>): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(photoStoreName, "readwrite")
      const store = transaction.objectStore(photoStoreName)
      for (const [key, blob] of photos) store.put(blob, key)
      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onabort = () => {
        reject(new LocalContentStorageError("Photo batch failed."))
      }
      transaction.onerror = () => {
        reject(new LocalContentStorageError("Photo batch failed."))
      }
    })
  } finally {
    database.close()
  }
}

export async function prunePhotos(referencedKeys: ReadonlySet<string>): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(photoStoreName, "readwrite")
      const cursor = transaction.objectStore(photoStoreName).openCursor()
      cursor.onsuccess = () => {
        const item = cursor.result
        if (item === null) return
        if (typeof item.key === "string" && !referencedKeys.has(item.key)) item.delete()
        item.continue()
      }
      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onabort = () => {
        reject(new LocalContentStorageError("Photo cleanup failed."))
      }
      transaction.onerror = () => {
        reject(new LocalContentStorageError("Photo cleanup failed."))
      }
    })
  } finally {
    database.close()
  }
}
