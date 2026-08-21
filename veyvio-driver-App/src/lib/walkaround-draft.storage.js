const DRAFT_PREFIX = "csf_walkaround_draft:";

export function draftStorageKey(driverId, vehicleId) {
  return `${DRAFT_PREFIX}${driverId}:${vehicleId}`;
}

export function loadWalkaroundDraft(driverId, vehicleId) {
  try {
    const raw = localStorage.getItem(draftStorageKey(driverId, vehicleId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist an in-progress walkaround draft only after write-readback verifies.
 * Callers must not claim "saved" unless ok is true.
 */
export function saveWalkaroundDraft(driverId, vehicleId, draft) {
  const key = draftStorageKey(driverId, vehicleId);
  const payload = {
    ...draft,
    savedAt: new Date().toISOString(),
    syncStatus: "local",
  };
  try {
    const serialized = JSON.stringify(payload);
    localStorage.setItem(key, serialized);
    const readBack = localStorage.getItem(key);
    if (readBack !== serialized) {
      return {
        ok: false,
        code: "DRAFT_SAVE_VERIFY_FAILED",
        message: "Draft could not be verified on this device.",
      };
    }
    return { ok: true, draft: payload };
  } catch {
    return {
      ok: false,
      code: "DRAFT_SAVE_FAILED",
      message: "Draft could not be saved on this device.",
    };
  }
}

/**
 * Remove a draft only after verifying the key is gone.
 * Callers must not claim the draft was discarded unless ok is true.
 */
export function clearWalkaroundDraft(driverId, vehicleId) {
  const key = draftStorageKey(driverId, vehicleId);
  try {
    localStorage.removeItem(key);
    if (localStorage.getItem(key) != null) {
      return {
        ok: false,
        code: "DRAFT_CLEAR_VERIFY_FAILED",
        message: "Draft could not be discarded on this device.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "DRAFT_CLEAR_FAILED",
      message: "Draft could not be discarded on this device.",
    };
  }
}
