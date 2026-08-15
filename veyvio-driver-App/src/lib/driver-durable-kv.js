/**
 * Transactional durable key-value store for Driver operational queues.
 * IndexedDB is the persistence mechanism because it is transactional, survives
 * WebView process death, and is already used for walkaround evidence blobs.
 * It is not chosen as a library fashion — it is the smallest store that can
 * put+get in one transaction and prove the write landed.
 */
export class DurableStorageError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "DurableStorageError"
    this.code = code
  }
}

const DB_NAME = "veyvio_driver_durable"
const DB_VERSION = 1
const STORE = "kv"

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new DurableStorageError("OFFLINE_STORAGE_UNAVAILABLE", "Durable device storage is not available."),
    )
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new DurableStorageError("OFFLINE_STORAGE_UNAVAILABLE", "Could not open durable storage."))
  })
}

export async function durableGet(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const request = tx.objectStore(STORE).get(key)
    request.onsuccess = () => {
      const row = request.result
      if (row == null) {
        resolve({ ok: true, found: false, value: undefined })
        return
      }
      if (row && row.__corrupt === true) {
        reject(new DurableStorageError("CORRUPT_OUTBOX", "Queued work on this device could not be read. It was not discarded."))
        return
      }
      resolve({ ok: true, found: true, value: row })
    }
    request.onerror = () =>
      reject(new DurableStorageError("CORRUPT_OUTBOX", "Queued work on this device could not be read. It was not discarded."))
  })
}

export async function durablePut(key, value) {
  const db = await openDb()
  const serialised = JSON.parse(JSON.stringify(value))
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(serialised, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not save this action on the device."))
    tx.onabort = () =>
      reject(tx.error ?? new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not save this action on the device."))
  })
  const check = await durableGet(key)
  if (!check.found || JSON.stringify(check.value) !== JSON.stringify(serialised)) {
    throw new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not confirm this action was saved on the device.")
  }
  return check.value
}

export async function durableDelete(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not update queued work."))
  })
}

/** Test-only IndexedDB stand-in. Production never uses this path. */
export function installMemoryIndexedDbForTests() {
  const stores = new Map()
  function dbFor(name) {
    if (!stores.has(name)) stores.set(name, new Map())
    return stores.get(name)
  }
  globalThis.indexedDB = {
    open(name) {
      const req = {}
      queueMicrotask(() => {
        const map = dbFor(name)
        req.result = {
          objectStoreNames: { contains: () => true },
          transaction(storeName, mode) {
            const tx = {
              error: null,
              objectStore() {
                return {
                  get(key) {
                    const r = {}
                    queueMicrotask(() => {
                      r.result = map.has(key) ? map.get(key) : undefined
                      r.onsuccess?.()
                    })
                    return r
                  },
                  put(value, key) {
                    if (mode === "readonly") throw new Error("readonly")
                    map.set(key, value)
                    return {}
                  },
                  delete(key) {
                    if (mode === "readonly") throw new Error("readonly")
                    map.delete(key)
                    return {}
                  },
                  getAllKeys() {
                    const r = {}
                    queueMicrotask(() => {
                      r.result = [...map.keys()]
                      r.onsuccess?.()
                    })
                    return r
                  },
                }
              },
            }
            queueMicrotask(() => tx.oncomplete?.())
            return tx
          },
        }
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }
  return () => {
    stores.clear()
  }
}

export function resetMemoryIndexedDbForTests() {
  if (typeof indexedDB?.open === "function") {
    installMemoryIndexedDbForTests()
  }
}
