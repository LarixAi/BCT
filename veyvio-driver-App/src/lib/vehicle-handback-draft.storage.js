import { driverWorkspaceStorageKey } from "@/lib/driver-workspace-storage";

export function handbackDraftKey(companyId, membershipId, vehicleId) {
  const vehicle = String(vehicleId ?? "vehicle");
  return driverWorkspaceStorageKey(companyId, membershipId, `handback-draft:${vehicle}`);
}

export function loadHandbackDraft(companyId, membershipId, vehicleId) {
  try {
    const raw = localStorage.getItem(handbackDraftKey(companyId, membershipId, vehicleId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveHandbackDraft(companyId, membershipId, vehicleId, draft) {
  try {
    localStorage.setItem(
      handbackDraftKey(companyId, membershipId, vehicleId),
      JSON.stringify(draft),
    );
  } catch {
    /* ignore quota */
  }
}

export function clearHandbackDraft(companyId, membershipId, vehicleId) {
  try {
    localStorage.removeItem(handbackDraftKey(companyId, membershipId, vehicleId));
  } catch {
    /* ignore */
  }
}
