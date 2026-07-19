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

export function saveWalkaroundDraft(driverId, vehicleId, draft) {
  try {
    localStorage.setItem(
      draftStorageKey(driverId, vehicleId),
      JSON.stringify({ ...draft, savedAt: new Date().toISOString(), syncStatus: "local" }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearWalkaroundDraft(driverId, vehicleId) {
  try {
    localStorage.removeItem(draftStorageKey(driverId, vehicleId));
  } catch {
    /* ignore */
  }
}
