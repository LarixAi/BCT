import { driverWorkspaceStorageKey } from "@/lib/driver-workspace-storage";

const LEGACY_QUEUE_PREFIX = "csf_walkaround_sync_queue:";

export function syncQueueKey(driverId, companyId, membershipId) {
  if (companyId && membershipId) {
    return driverWorkspaceStorageKey(companyId, membershipId, "walkaround-sync-queue");
  }
  return `${LEGACY_QUEUE_PREFIX}${driverId}`;
}

export function loadSyncQueue(driverId, companyId, membershipId) {
  try {
    const raw = localStorage.getItem(syncQueueKey(driverId, companyId, membershipId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(driverId, queue, companyId, membershipId) {
  try {
    localStorage.setItem(syncQueueKey(driverId, companyId, membershipId), JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function enqueueWalkaroundSubmission(driverId, payload, companyId, membershipId) {
  const queue = loadSyncQueue(driverId, companyId, membershipId);
  queue.push({
    id: `pending-${Date.now()}`,
    createdAt: new Date().toISOString(),
    companyId: companyId ?? null,
    membershipId: membershipId ?? null,
    payload,
  });
  saveSyncQueue(driverId, queue, companyId, membershipId);
  return queue.length;
}

export function dequeueWalkaroundSubmission(driverId, pendingId, companyId, membershipId) {
  const queue = loadSyncQueue(driverId, companyId, membershipId).filter((item) => item.id !== pendingId);
  saveSyncQueue(driverId, queue, companyId, membershipId);
  return queue;
}
