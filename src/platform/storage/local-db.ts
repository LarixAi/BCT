import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { OutboxMutation } from "@/types/sync";

const DB_NAME = "veyvio-yard";
const DB_VERSION = 2;

type StoreName = "bootstrap" | "outbox";

type BootstrapCacheRecord = BootstrapPayload & { cacheKey: string };

/** Composite key so BCT and Metroline never share offline cache for the same depot id. */
export function bootstrapCacheKey(companyId: string, depotId: string): string {
  return `${companyId}:${depotId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;
      if (oldVersion < 2 && db.objectStoreNames.contains("bootstrap")) {
        db.deleteObjectStore("bootstrap");
      }
      if (!db.objectStoreNames.contains("bootstrap")) {
        db.createObjectStore("bootstrap", { keyPath: "cacheKey" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        const store = db.createObjectStore("outbox", { keyPath: "localOperationId" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("companyId", "companyId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onerror = () => reject(req.error ?? new Error(`IDB ${storeName} failed`));
    req.onsuccess = () => resolve(req.result as T);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error(`IDB tx ${storeName} failed`));
  });
}

export async function saveBootstrapCache(payload: BootstrapPayload): Promise<void> {
  const record: BootstrapCacheRecord = {
    ...payload,
    cacheKey: bootstrapCacheKey(payload.companyId, payload.depotId),
  };
  await withStore("bootstrap", "readwrite", store => store.put(record));
}

export async function loadBootstrapCache(companyId: string, depotId: string): Promise<BootstrapPayload | null> {
  try {
    const record = await withStore<BootstrapCacheRecord | undefined>(
      "bootstrap",
      "readonly",
      store => store.get(bootstrapCacheKey(companyId, depotId)),
    );
    if (!record || record.companyId !== companyId) return null;
    const { cacheKey: _cacheKey, ...payload } = record;
    return payload;
  } catch {
    return null;
  }
}

export async function saveOutboxMutation(mutation: OutboxMutation): Promise<void> {
  await withStore("outbox", "readwrite", store => store.put(mutation));
}

export async function listOutboxMutations(): Promise<OutboxMutation[]> {
  try {
    return await withStore("outbox", "readonly", store => store.getAll());
  } catch {
    return [];
  }
}

export async function listOutboxMutationsForCompany(companyId: string): Promise<OutboxMutation[]> {
  const all = await listOutboxMutations();
  return all.filter(m => m.companyId === companyId);
}

export async function updateOutboxMutation(mutation: OutboxMutation): Promise<void> {
  await withStore("outbox", "readwrite", store => store.put(mutation));
}

/** Drop queued sync items — used when switching company or signing out. */
export async function clearOutboxMutations(companyId?: string): Promise<void> {
  const mutations = companyId
    ? (await listOutboxMutations()).filter(m => m.companyId === companyId)
    : await listOutboxMutations();
  if (mutations.length === 0) return;
  await withStore("outbox", "readwrite", store => {
    for (const m of mutations) {
      store.delete(m.localOperationId);
    }
    return store.getAll();
  });
}

/** Remove failed/conflict items only (e.g. stale pre-deploy backlog). */
export async function clearFailedOutboxMutations(): Promise<number> {
  const mutations = await listOutboxMutations();
  const failed = mutations.filter(m => m.status === "failed" || m.status === "conflict");
  if (failed.length === 0) return 0;
  await withStore("outbox", "readwrite", store => {
    for (const m of failed) {
      store.delete(m.localOperationId);
    }
    return store.getAll();
  });
  return failed.length;
}
