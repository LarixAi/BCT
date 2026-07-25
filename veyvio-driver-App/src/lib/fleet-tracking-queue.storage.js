import { driverWorkspaceStorageKey } from "@/lib/driver-workspace-storage";

const LEGACY_QUEUE_PREFIX = "csf_fleet_tracking_ping_queue:";

export function fleetPingQueueKey(driverId, companyId, membershipId) {
  if (companyId && membershipId) {
    return driverWorkspaceStorageKey(companyId, membershipId, "fleet-ping-queue");
  }
  return `${LEGACY_QUEUE_PREFIX}${driverId}`;
}

function migrateLegacyFleetPingQueue(driverId, companyId, membershipId) {
  if (!companyId || !membershipId || typeof localStorage === "undefined") return;
  const legacyKey = `${LEGACY_QUEUE_PREFIX}${driverId}`;
  const scopedKey = fleetPingQueueKey(driverId, companyId, membershipId);
  if (legacyKey === scopedKey) return;

  try {
    const legacyRaw = localStorage.getItem(legacyKey);
    if (!legacyRaw) return;
    const legacyQueue = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyQueue) || legacyQueue.length === 0) return;

    const existingRaw = localStorage.getItem(scopedKey);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      if (Array.isArray(existing) && existing.length > 0) return;
    }

    localStorage.setItem(scopedKey, legacyRaw);
    localStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}

export function loadFleetPingQueue(driverId, companyId, membershipId) {
  migrateLegacyFleetPingQueue(driverId, companyId, membershipId);
  try {
    const raw = localStorage.getItem(fleetPingQueueKey(driverId, companyId, membershipId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFleetPingQueue(driverId, queue, companyId, membershipId) {
  try {
    localStorage.setItem(
      fleetPingQueueKey(driverId, companyId, membershipId),
      JSON.stringify(queue),
    );
  } catch {
    /* ignore */
  }
}

export function enqueueFleetPing(driverId, payload, companyId, membershipId) {
  const queue = loadFleetPingQueue(driverId, companyId, membershipId);
  queue.push({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    companyId: companyId ?? null,
    membershipId: membershipId ?? null,
    payload,
  });
  saveFleetPingQueue(driverId, queue, companyId, membershipId);
  return queue.length;
}

export function dequeueFleetPing(driverId, pendingId, companyId, membershipId) {
  const queue = loadFleetPingQueue(driverId, companyId, membershipId).filter(
    (item) => item.id !== pendingId,
  );
  saveFleetPingQueue(driverId, queue, companyId, membershipId);
  return queue;
}

export function clearFleetPingQueue(driverId, companyId, membershipId) {
  saveFleetPingQueue(driverId, [], companyId, membershipId);
}
