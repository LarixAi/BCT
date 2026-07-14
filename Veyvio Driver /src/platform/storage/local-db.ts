import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import type { OutboxMutation } from "@/types/sync";

const DB_NAME = "veyvio-driver";
const DB_VERSION = 2;

type StoreName = "bootstrap" | "outbox" | "active_trip";

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
      if (!db.objectStoreNames.contains("active_trip")) {
        db.createObjectStore("active_trip", { keyPath: "dutyId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
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
  await withStore("bootstrap", "readwrite", (store) => store.put(payload));
}

export async function loadBootstrapCache(depotId: string): Promise<BootstrapPayload | null> {
  try {
    return await withStore("bootstrap", "readonly", (store) => store.get(depotId));
  } catch {
    return null;
  }
}

export async function saveOutboxMutation(mutation: OutboxMutation): Promise<void> {
  await withStore("outbox", "readwrite", (store) => store.put(mutation));
}

export async function listOutboxMutations(): Promise<OutboxMutation[]> {
  try {
    return await withStore("outbox", "readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}

export async function updateOutboxMutation(mutation: OutboxMutation): Promise<void> {
  await withStore("outbox", "readwrite", (store) => store.put(mutation));
}

export async function saveActiveTripSnapshot<T extends { dutyId: string }>(snapshot: T): Promise<void> {
  await withStore("active_trip", "readwrite", (store) => store.put(snapshot));
}

export async function loadActiveTripSnapshot<T extends { dutyId: string }>(
  dutyId: string,
): Promise<T | null> {
  try {
    return await withStore("active_trip", "readonly", (store) => store.get(dutyId));
  } catch {
    return null;
  }
}

export async function loadLatestActiveTripSnapshot<T extends { dutyId: string; recordedAt: string }>(): Promise<T | null> {
  try {
    const all = await withStore("active_trip", "readonly", (store) => store.getAll());
    if (!all.length) return null;
    return [...all].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )[0] as T;
  } catch {
    return null;
  }
}

export async function clearActiveTripSnapshot(dutyId: string): Promise<void> {
  try {
    await withStore("active_trip", "readwrite", (store) => store.delete(dutyId));
  } catch {
    // Non-blocking cleanup.
  }
}

export async function clearBootstrapCache(depotId: string): Promise<void> {
  try {
    await withStore("bootstrap", "readwrite", (store) => store.delete(depotId));
  } catch {
    // Non-blocking cleanup.
  }
}

export async function clearSyncedOutboxMutations(): Promise<void> {
  const mutations = await listOutboxMutations();
  const synced = mutations.filter((item) => item.status === "synced");
  await Promise.all(
    synced.map((item) => withStore("outbox", "readwrite", (store) => store.delete(item.localOperationId))),
  );
}

export async function clearAllActiveTripSnapshots(): Promise<void> {
  try {
    const all = await withStore("active_trip", "readonly", (store) => store.getAll());
    await Promise.all(
      all.map((item: { dutyId: string }) => clearActiveTripSnapshot(item.dutyId)),
    );
  } catch {
    // Non-blocking cleanup.
  }
}

export async function countUnsyncedOutboxMutations(): Promise<number> {
  const mutations = await listOutboxMutations();
  return mutations.filter((item) => item.status !== "synced").length;
}
