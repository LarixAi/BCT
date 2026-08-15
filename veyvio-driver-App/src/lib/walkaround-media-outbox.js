/**
 * Durable walkaround evidence store (IndexedDB blobs).
 * Survives process death; referenced from sync queue payloads via mediaRef.
 */
import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage";
import { DurableStorageError } from "@/lib/driver-durable-kv";

const DB_NAME = "veyvio_driver_media";
const DB_VERSION = 1;
const STORE = "media";

function scopedPrefix(companyId, membershipId) {
  return driverWorkspaceStorageKey(companyId, membershipId, "media:");
}

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new DurableStorageError("OFFLINE_STORAGE_UNAVAILABLE", "Required check evidence could not be saved on this device."),
    );
  }
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

async function putMedia(record) {
  const blob = record.blob
  const bytes = blob ? new Uint8Array(await blob.arrayBuffer()) : new Uint8Array()
  const storedRecord = {
    ...record,
    blob: undefined,
    blobBytes: Array.from(bytes),
  }
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(storedRecord, storedRecord.id);
    tx.oncomplete = () => resolve(storedRecord.id);
    tx.onerror = () => reject(tx.error ?? new Error("Could not persist media"));
  });
  const stored = await getMedia(record.id);
  if (!stored) {
    throw new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Required check evidence could not be confirmed on this device.");
  }
  return record.id;
}

function recordToBlob(record) {
  if (record?.blob) return record.blob
  if (Array.isArray(record?.blobBytes)) {
    return new Blob([new Uint8Array(record.blobBytes)], { type: record.mimeType || "image/jpeg" })
  }
  return null
}

async function getMedia(mediaId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(mediaId);
    request.onsuccess = () => {
      const row = request.result ?? null
      if (!row) {
        resolve(null)
        return
      }
      resolve({ ...row, blob: recordToBlob(row) })
    }
    request.onerror = () => reject(request.error ?? new Error("Could not load media"));
  });
}

async function deleteMedia(mediaId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(mediaId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete media"));
  });
}

function blobToDataUrl(blob) {
  if (typeof FileReader === "undefined") {
    return blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read media blob"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64 = ""] = String(dataUrl).split(",");
  const mimeMatch = meta.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function createMediaId(prefix = "media", companyId, membershipId) {
  const scope = scopedPrefix(companyId, membershipId);
  return `${scope}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function persistWalkaroundMediaDataUrl({
  dataUrl,
  companyId,
  membershipId,
  kind,
  itemKey = null,
  clientCheckId = null,
}) {
  if (!dataUrl?.startsWith("data:")) return null;
  const { companyId: company, membershipId: membership } = requireWorkspaceIds(companyId, membershipId);
  const id = createMediaId(kind ?? "walkaround", company, membership);
  const blob = dataUrlToBlob(dataUrl);
  let checksum = 0;
  for (let i = 0; i < dataUrl.length; i += 1) checksum = (checksum * 31 + dataUrl.charCodeAt(i)) >>> 0;
  await putMedia({
    id,
    companyId: company,
    membershipId: membership,
    kind: kind ?? "photo",
    itemKey,
    clientCheckId,
    mimeType: blob.type,
    bytes: blob.size,
    checksum: String(checksum),
    blob,
    status: "queued",
    capturedAt: new Date().toISOString(),
  });
  return id;
}

export async function loadWalkaroundMediaDataUrl(mediaId, { companyId, membershipId } = {}) {
  requireWorkspaceIds(companyId, membershipId);
  const record = await getMedia(mediaId);
  if (!record) return null;
  if (String(record.companyId) !== String(companyId) || String(record.membershipId) !== String(membershipId)) {
    throw new DurableStorageError("OFFLINE_CONTEXT_NOT_READY", "This evidence belongs to another workspace.");
  }
  if (!record.blob) return null;
  return blobToDataUrl(record.blob);
}

export async function markWalkaroundMediaUploaded(mediaId) {
  const record = await getMedia(mediaId);
  if (!record) return;
  await putMedia({ ...record, status: "uploaded", uploadedAt: new Date().toISOString() });
  await deleteMedia(mediaId);
}

function answerMediaFields(answer) {
  if (!answer || typeof answer !== "object") return answer;
  const next = { ...answer };
  if (next.photoDataUrl?.startsWith("data:")) {
    next._inlinePhotoDataUrl = next.photoDataUrl;
  }
  return next;
}

export async function externalizeWalkaroundPayloadMedia(payload, { companyId, membershipId }) {
  if (!payload) return payload;
  const clientCheckId =
    payload.clientCheckId ??
    `chk_${payload.driver?.id ?? "driver"}_${payload.vehicle?.id ?? "vehicle"}_${Date.now()}`;
  const next = { ...payload, clientCheckId, mediaRefs: [...(payload.mediaRefs ?? [])] };

  const externalizeDataUrl = async (dataUrl, kind, itemKey = null) => {
    const mediaRef = await persistWalkaroundMediaDataUrl({
      dataUrl,
      companyId,
      membershipId,
      kind,
      itemKey,
      clientCheckId,
    });
    if (mediaRef) next.mediaRefs.push(mediaRef);
    return mediaRef;
  };

  if (next.odometerPhotoDataUrl?.startsWith("data:")) {
    const ref = await externalizeDataUrl(next.odometerPhotoDataUrl, "odometer", "odometer");
    next.odometerPhotoMediaRef = ref;
    delete next.odometerPhotoDataUrl;
  }

  if (next.driverSignatureDataUrl?.startsWith("data:")) {
    const ref = await externalizeDataUrl(next.driverSignatureDataUrl, "signature", "signature");
    next.driverSignatureMediaRef = ref;
    delete next.driverSignatureDataUrl;
  }

  if (next.answers && typeof next.answers === "object") {
    const answers = {};
    for (const [itemId, answer] of Object.entries(next.answers)) {
      const copy = answerMediaFields(answer);
      if (copy._inlinePhotoDataUrl) {
        const ref = await externalizeDataUrl(copy._inlinePhotoDataUrl, "check_item", itemId);
        copy.photoMediaRef = ref;
        delete copy.photoDataUrl;
        delete copy._inlinePhotoDataUrl;
      }
      answers[itemId] = copy;
    }
    next.answers = answers;
  }

  return next;
}

export async function hydrateWalkaroundPayloadMedia(payload, { companyId, membershipId } = {}) {
  if (!payload) return payload;
  const next = { ...payload };
  const scope = {
    companyId: companyId ?? payload.companyId,
    membershipId: membershipId ?? payload.membershipId,
  };

  if (!next.odometerPhotoDataUrl && next.odometerPhotoMediaRef) {
    next.odometerPhotoDataUrl = await loadWalkaroundMediaDataUrl(next.odometerPhotoMediaRef, scope);
  }
  if (!next.driverSignatureDataUrl && next.driverSignatureMediaRef) {
    next.driverSignatureDataUrl = await loadWalkaroundMediaDataUrl(next.driverSignatureMediaRef, scope);
  }

  if (next.answers && typeof next.answers === "object") {
    const answers = {};
    for (const [itemId, answer] of Object.entries(next.answers)) {
      const copy = { ...answer };
      if (!copy.photoDataUrl && copy.photoMediaRef) {
        copy.photoDataUrl = await loadWalkaroundMediaDataUrl(copy.photoMediaRef, scope);
      }
      answers[itemId] = copy;
    }
    next.answers = answers;
  }

  return next;
}

export async function releaseWalkaroundPayloadMedia(payload) {
  const refs = new Set(payload?.mediaRefs ?? []);
  if (payload?.odometerPhotoMediaRef) refs.add(payload.odometerPhotoMediaRef);
  if (payload?.driverSignatureMediaRef) refs.add(payload.driverSignatureMediaRef);
  if (payload?.answers) {
    for (const answer of Object.values(payload.answers)) {
      if (answer?.photoMediaRef) refs.add(answer.photoMediaRef);
    }
  }
  await Promise.all([...refs].map((id) => deleteMedia(id)));
}

export async function countPendingWalkaroundMedia(companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId);
  const prefix = scopedPrefix(companyId, membershipId);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAllKeys?.() ?? tx.objectStore(STORE).openCursor();
    if (tx.objectStore(STORE).getAllKeys) {
      request.onsuccess = () => {
        const keys = request.result ?? [];
        resolve(keys.filter((key) => String(key).startsWith(prefix)).length);
      };
      request.onerror = () => reject(request.error);
      return;
    }
    let count = 0;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(count);
        return;
      }
      if (String(cursor.key).startsWith(prefix)) count += 1;
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}
