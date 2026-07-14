import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { OutboxMutation } from "@/types/sync";

const DB_NAME = "veyvio-yard";
const DB_VERSION = 1;

type StoreName = "bootstrap" | "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("bootstrap")) {
        db.createObjectStore("bootstrap", { keyPath: "depotId" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        const store = db.createObjectStore("outbox", { keyPath: "localOperationId" });
        store.createIndex("status", "status", { unique: false });
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
  await withStore("bootstrap", "readwrite", store => store.put(payload));
}

export async function loadBootstrapCache(depotId: string): Promise<BootstrapPayload | null> {
  try {
    return await withStore("bootstrap", "readonly", store => store.get(depotId));
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

export async function updateOutboxMutation(mutation: OutboxMutation): Promise<void> {
  await withStore("outbox", "readwrite", store => store.put(mutation));
}
