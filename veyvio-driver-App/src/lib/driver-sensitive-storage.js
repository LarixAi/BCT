/**
 * Workspace-scoped sensitive local persistence (IndexedDB).
 * Message drafts and reply drafts — never plain localStorage.
 */
import { driverWorkspaceStorageKey } from "@/lib/driver-workspace-storage";

const DB_NAME = "veyvio_driver_sensitive";
const DB_VERSION = 1;
const STORE = "records";

const memoryFallback = new Map();

function workspaceRecordKey(companyId, membershipId, suffix) {
  return driverWorkspaceStorageKey(companyId, membershipId, suffix);
}

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

async function putRecord(key, value) {
  if (!key) return false;
  const db = await openDb();
  if (!db) {
    memoryFallback.set(key, value);
    return true;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error ?? new Error("Could not save record"));
  });
}

async function getRecord(key) {
  if (!key) return null;
  const db = await openDb();
  if (!db) return memoryFallback.get(key) ?? null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read record"));
  });
}

async function deleteRecord(key) {
  if (!key) return;
  const db = await openDb();
  if (!db) {
    memoryFallback.delete(key);
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete record"));
  });
}

export async function saveMessageDraft(companyId, membershipId, draft) {
  const key = workspaceRecordKey(companyId, membershipId, "message-compose-draft");
  await putRecord(key, {
    ...draft,
    savedAt: new Date().toISOString(),
  });
}

export async function loadMessageDraft(companyId, membershipId) {
  const key = workspaceRecordKey(companyId, membershipId, "message-compose-draft");
  return getRecord(key);
}

export async function clearMessageDraft(companyId, membershipId) {
  await deleteRecord(workspaceRecordKey(companyId, membershipId, "message-compose-draft"));
}

export async function saveThreadReplyDraft(companyId, membershipId, threadId, body) {
  const key = workspaceRecordKey(companyId, membershipId, `message-reply-draft:${threadId}`);
  await putRecord(key, { body, savedAt: new Date().toISOString() });
}

export async function loadThreadReplyDraft(companyId, membershipId, threadId) {
  const key = workspaceRecordKey(companyId, membershipId, `message-reply-draft:${threadId}`);
  const record = await getRecord(key);
  return record?.body ?? "";
}

export async function clearThreadReplyDraft(companyId, membershipId, threadId) {
  await deleteRecord(workspaceRecordKey(companyId, membershipId, `message-reply-draft:${threadId}`));
}

/** Remove all workspace-scoped sensitive records on logout / tenant switch. */
export async function clearDriverSensitiveWorkspace(companyId, membershipId) {
  const prefixes = [
    workspaceRecordKey(companyId, membershipId, "message-compose-draft"),
    workspaceRecordKey(companyId, membershipId, "message-reply-draft:"),
  ];
  const db = await openDb();
  if (!db) {
    for (const key of [...memoryFallback.keys()]) {
      if (prefixes.some((prefix) => key.startsWith(prefix.replace(/:$/, "")) || key === prefixes[0])) {
        memoryFallback.delete(key);
      }
    }
    return;
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const key = String(cursor.key ?? "");
      const scopedPrefix = `driver:${companyId}:${membershipId}:`;
      if (key.startsWith(scopedPrefix) && key.includes("message-")) {
        cursor.delete();
      }
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not clear sensitive workspace"));
  });
}
