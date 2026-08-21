/**
 * Managed IndexedDB connection for Driver operational durability.
 * Schema v2: kv (legacy array blobs) + queue_items (item-per-record).
 */
export class DurableStorageError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "DurableStorageError"
    this.code = code
  }
}

export const DB_NAME = "veyvio_driver_durable"
export const DB_VERSION = 2
export const KV_STORE = "kv"
export const QUEUE_ITEMS_STORE = "queue_items"

let dbPromise = null
let openDbHandle = null
const memoryIndexedDbResetHooks = new Set()

/** Test-only: extra cleanup when the in-memory IndexedDB mock is reinstalled. */
export function onMemoryIndexedDbReset(hook) {
  if (typeof hook === "function") memoryIndexedDbResetHooks.add(hook)
}

function rejectUnavailable() {
  return Promise.reject(
    new DurableStorageError("OFFLINE_STORAGE_UNAVAILABLE", "Durable device storage is not available."),
  )
}

function resetConnection() {
  try {
    openDbHandle?.close()
  } catch {
    /* already closed */
  }
  openDbHandle = null
  dbPromise = null
}

export function closeDurableConnection() {
  resetConnection()
}

function openDatabase() {
  if (typeof indexedDB === "undefined") return rejectUnavailable()
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE)
      if (!db.objectStoreNames.contains(QUEUE_ITEMS_STORE)) db.createObjectStore(QUEUE_ITEMS_STORE)
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        resetConnection()
      }
      resolve(db)
    }
    request.onerror = () =>
      reject(request.error ?? new DurableStorageError("OFFLINE_STORAGE_UNAVAILABLE", "Could not open durable storage."))
    request.onblocked = () => {
      resetConnection()
    }
  })
}

export async function getDurableDb() {
  if (!dbPromise) {
    dbPromise = openDatabase()
      .then((db) => {
        openDbHandle = db
        return db
      })
      .catch((error) => {
        dbPromise = null
        throw error
      })
  }
  return dbPromise
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

export async function durableGet(key, storeName = KV_STORE) {
  const db = await getDurableDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const request = tx.objectStore(storeName).get(key)
    request.onsuccess = () => {
      const row = request.result
      if (row == null) {
        resolve({ ok: true, found: false, value: undefined })
        return
      }
      if (row && row.__corrupt === true) {
        reject(
          new DurableStorageError(
            "CORRUPT_OUTBOX",
            "Queued work on this device could not be read. It was not discarded.",
          ),
        )
        return
      }
      resolve({ ok: true, found: true, value: row })
    }
    request.onerror = () =>
      reject(
        new DurableStorageError(
          "CORRUPT_OUTBOX",
          "Queued work on this device could not be read. It was not discarded.",
        ),
      )
  })
}

export async function durablePut(key, value, storeName = KV_STORE) {
  const db = await getDurableDb()
  const serialised = cloneJson(value)
  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).put(serialised, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not save this action on the device."))
    tx.onabort = () =>
      reject(tx.error ?? new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not save this action on the device."))
  })
  const check = await durableGet(key, storeName)
  if (!check.found || JSON.stringify(check.value) !== JSON.stringify(serialised)) {
    throw new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not confirm this action was saved on the device.")
  }
  return serialised
}

export async function durableDelete(key, storeName = KV_STORE) {
  const db = await getDurableDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not update queued work."))
  })
}

export async function durableListByPrefix(prefix, storeName = QUEUE_ITEMS_STORE) {
  const db = await getDurableDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const request = store.getAllKeys()
    request.onsuccess = () => {
      const keys = (request.result ?? []).filter((key) => String(key).startsWith(prefix))
      if (keys.length === 0) {
        resolve([])
        return
      }
      const values = []
      let pending = keys.length
      for (const key of keys) {
        const getReq = store.get(key)
        getReq.onsuccess = () => {
          if (getReq.result != null) values.push({ key, value: getReq.result })
          pending -= 1
          if (pending === 0) resolve(values)
        }
        getReq.onerror = () =>
          reject(
            new DurableStorageError(
              "CORRUPT_OUTBOX",
              "Queued work on this device could not be read. It was not discarded.",
            ),
          )
      }
    }
    request.onerror = () =>
      reject(
        new DurableStorageError(
          "CORRUPT_OUTBOX",
          "Queued work on this device could not be read. It was not discarded.",
        ),
      )
  })
}

/** Test-only IndexedDB stand-in. Production never uses this path. */
export function installMemoryIndexedDbForTests() {
  resetConnection()
  const databases = new Map()

  function dbRecord(name) {
    if (!databases.has(name)) {
      databases.set(name, { version: 0, stores: new Map() })
    }
    return databases.get(name)
  }

  globalThis.indexedDB = {
    open(name, version = 1) {
      const req = {}
      queueMicrotask(() => {
        const record = dbRecord(name)
        const ensureStore = (storeName) => {
          if (!record.stores.has(storeName)) record.stores.set(storeName, new Map())
        }
        const fakeDb = {
          objectStoreNames: {
            contains: (storeName) => record.stores.has(storeName),
            *[Symbol.iterator]() {
              yield* record.stores.keys()
            },
          },
          createObjectStore(storeName) {
            ensureStore(storeName)
            return {}
          },
          close() {},
          onversionchange: null,
          get version() {
            return record.version
          },
          transaction(storeName) {
            if (!record.stores.has(storeName)) {
              const error = new Error(
                "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.",
              )
              error.name = "NotFoundError"
              throw error
            }
            const map = record.stores.get(storeName)
            const tx = { error: null, _pending: 0, _armed: false }
            const arm = () => {
              if (tx._armed) return
              tx._armed = true
              queueMicrotask(() => {
                tx._armed = false
                if (tx._pending === 0) tx.oncomplete?.()
              })
            }
            tx.objectStore = () => ({
              get(key) {
                const r = {}
                tx._pending += 1
                queueMicrotask(() => {
                  r.result = map.has(key) ? map.get(key) : undefined
                  r.onsuccess?.()
                  tx._pending -= 1
                  arm()
                })
                return r
              },
              put(value, key) {
                map.set(key, value)
                arm()
                return {}
              },
              delete(key) {
                map.delete(key)
                arm()
                return {}
              },
              getAllKeys() {
                const r = {}
                tx._pending += 1
                queueMicrotask(() => {
                  r.result = [...map.keys()]
                  r.onsuccess?.()
                  tx._pending -= 1
                  arm()
                })
                return r
              },
            })
            arm()
            return tx
          },
        }
        req.result = fakeDb
        if (version > record.version) {
          req.onupgradeneeded?.()
          record.version = version
        }
        req.onsuccess?.()
      })
      return req
    },
  }
  return () => {
    databases.clear()
    resetConnection()
  }
}

export function resetMemoryIndexedDbForTests() {
  for (const hook of memoryIndexedDbResetHooks) {
    try {
      hook()
    } catch {
      /* ignore */
    }
  }
  installMemoryIndexedDbForTests()
}
