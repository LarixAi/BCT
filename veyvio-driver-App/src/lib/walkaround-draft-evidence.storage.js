/**
 * Pre-Submit walkaround evidence (odometer photo + signature).
 * Separate from the submission media-outbox / queue lifecycle.
 * Survives process death with the in-progress draft; verified write-readback before callers may treat evidence as recoverable.
 */
import { DurableStorageError, onMemoryIndexedDbReset } from "@/lib/driver-durable-kv";
import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage";

export const DRAFT_EVIDENCE_DB_NAME = "veyvio_driver_walkaround_draft_evidence";
export const DRAFT_EVIDENCE_DB_VERSION = 1;
const STORE = "evidence";

let dbPromise = null;
let dbHandle = null;

function resetConnection() {
  try {
    dbHandle?.close();
  } catch {
    /* already closed */
  }
  dbHandle = null;
  dbPromise = null;
}

export function closeWalkaroundDraftEvidenceConnection() {
  resetConnection();
}

onMemoryIndexedDbReset(resetConnection);

function schemaError(code, message) {
  return new DurableStorageError(code, message);
}

function evidenceKey(companyId, membershipId, driverId, vehicleId) {
  const driver = String(driverId ?? "").trim();
  const vehicle = String(vehicleId ?? "").trim();
  if (!driver || !vehicle) {
    throw schemaError(
      "DRAFT_EVIDENCE_CONTEXT_INVALID",
      "Check evidence could not be saved — missing driver or vehicle context.",
    );
  }
  return driverWorkspaceStorageKey(companyId, membershipId, `draft_evidence:${driver}:${vehicle}`);
}

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      schemaError("OFFLINE_STORAGE_UNAVAILABLE", "Check evidence could not be saved on this device."),
    );
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      resetConnection();
      reject(
        error instanceof DurableStorageError
          ? error
          : schemaError("OFFLINE_STORAGE_UNAVAILABLE", "Check evidence could not be saved on this device."),
      );
    };
    const request = indexedDB.open(DRAFT_EVIDENCE_DB_NAME, DRAFT_EVIDENCE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => {
      if (settled) {
        try {
          request.result?.close();
        } catch {
          /* ignore */
        }
        return;
      }
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        try {
          db.close();
        } catch {
          /* ignore */
        }
        fail(
          schemaError(
            "OFFLINE_STORAGE_SCHEMA_INVALID",
            "Check evidence could not be saved on this device.",
          ),
        );
        return;
      }
      db.onversionchange = () => {
        try {
          db.close();
        } catch {
          /* ignore */
        }
        resetConnection();
      };
      settled = true;
      resolve(db);
    };
    request.onerror = () =>
      fail(
        request.error ??
          schemaError("OFFLINE_STORAGE_UNAVAILABLE", "Check evidence could not be saved on this device."),
      );
    request.onblocked = () =>
      fail(
        schemaError(
          "OFFLINE_STORAGE_SCHEMA_BLOCKED",
          "Check evidence could not be saved on this device.",
        ),
      );
  });
}

async function openDb() {
  if (!dbPromise) {
    dbPromise = openDatabase()
      .then((db) => {
        dbHandle = db;
        return db;
      })
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
}

async function getRecord(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () =>
      reject(
        request.error ??
          schemaError("OFFLINE_STORAGE_UNAVAILABLE", "Check evidence could not be read on this device."),
      );
  });
}

async function putRecord(key, record) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        tx.error ??
          schemaError("OFFLINE_STORAGE_WRITE_FAILED", "Check evidence could not be saved on this device."),
      );
    tx.onabort = () =>
      reject(
        tx.error ??
          schemaError("OFFLINE_STORAGE_WRITE_FAILED", "Check evidence could not be saved on this device."),
      );
  });
}

async function deleteRecord(key) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        tx.error ??
          schemaError("OFFLINE_STORAGE_WRITE_FAILED", "Check evidence could not be discarded on this device."),
      );
  });
}

function normalizeDataUrl(value) {
  if (value == null) return null;
  const text = String(value);
  return text.startsWith("data:") ? text : null;
}

function recordsMatch(a, b) {
  return (
    String(a?.companyId ?? "") === String(b?.companyId ?? "") &&
    String(a?.membershipId ?? "") === String(b?.membershipId ?? "") &&
    String(a?.driverId ?? "") === String(b?.driverId ?? "") &&
    String(a?.vehicleId ?? "") === String(b?.vehicleId ?? "") &&
    String(a?.odometerPhotoDataUrl ?? "") === String(b?.odometerPhotoDataUrl ?? "") &&
    String(a?.signatureDataUrl ?? "") === String(b?.signatureDataUrl ?? "")
  );
}

/**
 * Persist pre-Submit evidence only after write-readback verifies.
 * Pass undefined for a field to leave it unchanged; null to clear that field.
 */
export async function saveWalkaroundDraftEvidence({
  companyId,
  membershipId,
  driverId,
  vehicleId,
  odometerPhotoDataUrl,
  signatureDataUrl,
} = {}) {
  try {
    const scope = requireWorkspaceIds(companyId, membershipId);
    const key = evidenceKey(scope.companyId, scope.membershipId, driverId, vehicleId);
    const existing = await getRecord(key);
    const next = {
      companyId: scope.companyId,
      membershipId: scope.membershipId,
      driverId: String(driverId).trim(),
      vehicleId: String(vehicleId).trim(),
      odometerPhotoDataUrl:
        odometerPhotoDataUrl === undefined
          ? normalizeDataUrl(existing?.odometerPhotoDataUrl)
          : normalizeDataUrl(odometerPhotoDataUrl),
      signatureDataUrl:
        signatureDataUrl === undefined
          ? normalizeDataUrl(existing?.signatureDataUrl)
          : normalizeDataUrl(signatureDataUrl),
      savedAt: new Date().toISOString(),
    };

    if (!next.odometerPhotoDataUrl && !next.signatureDataUrl) {
      await deleteRecord(key);
      if ((await getRecord(key)) != null) {
        return {
          ok: false,
          code: "DRAFT_EVIDENCE_CLEAR_VERIFY_FAILED",
          message: "Check evidence could not be discarded on this device.",
        };
      }
      return { ok: true, evidence: null };
    }

    await putRecord(key, next);
    const readBack = await getRecord(key);
    if (!readBack || !recordsMatch(readBack, next)) {
      return {
        ok: false,
        code: "DRAFT_EVIDENCE_VERIFY_FAILED",
        message: "Check evidence could not be verified on this device.",
      };
    }
    return { ok: true, evidence: readBack };
  } catch (error) {
    if (error?.code === "OFFLINE_CONTEXT_NOT_READY") {
      return {
        ok: false,
        code: "OFFLINE_CONTEXT_NOT_READY",
        message: "Check evidence could not be saved — company context is not ready.",
      };
    }
    return {
      ok: false,
      code: error?.code ?? "DRAFT_EVIDENCE_SAVE_FAILED",
      message: error?.message ?? "Check evidence could not be saved on this device.",
    };
  }
}

export async function loadWalkaroundDraftEvidence({
  companyId,
  membershipId,
  driverId,
  vehicleId,
} = {}) {
  try {
    const scope = requireWorkspaceIds(companyId, membershipId);
    const key = evidenceKey(scope.companyId, scope.membershipId, driverId, vehicleId);
    const record = await getRecord(key);
    if (!record) return null;
    if (
      String(record.companyId) !== scope.companyId ||
      String(record.membershipId) !== scope.membershipId ||
      String(record.driverId) !== String(driverId).trim() ||
      String(record.vehicleId) !== String(vehicleId).trim()
    ) {
      return null;
    }
    return {
      ...record,
      odometerPhotoDataUrl: normalizeDataUrl(record.odometerPhotoDataUrl),
      signatureDataUrl: normalizeDataUrl(record.signatureDataUrl),
    };
  } catch {
    return null;
  }
}

/**
 * Remove pre-Submit evidence only after verifying the key is gone.
 */
export async function clearWalkaroundDraftEvidence({
  companyId,
  membershipId,
  driverId,
  vehicleId,
} = {}) {
  try {
    const scope = requireWorkspaceIds(companyId, membershipId);
    const key = evidenceKey(scope.companyId, scope.membershipId, driverId, vehicleId);
    await deleteRecord(key);
    if ((await getRecord(key)) != null) {
      return {
        ok: false,
        code: "DRAFT_EVIDENCE_CLEAR_VERIFY_FAILED",
        message: "Check evidence could not be discarded on this device.",
      };
    }
    return { ok: true };
  } catch (error) {
    if (error?.code === "OFFLINE_CONTEXT_NOT_READY") {
      return {
        ok: false,
        code: "OFFLINE_CONTEXT_NOT_READY",
        message: "Check evidence could not be discarded — company context is not ready.",
      };
    }
    return {
      ok: false,
      code: error?.code ?? "DRAFT_EVIDENCE_CLEAR_FAILED",
      message: error?.message ?? "Check evidence could not be discarded on this device.",
    };
  }
}
