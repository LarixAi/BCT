const QUEUE_PREFIX = "csf_walkaround_sync_queue:";

export function syncQueueKey(driverId) {
  return `${QUEUE_PREFIX}${driverId}`;
}

export function loadSyncQueue(driverId) {
  try {
    const raw = localStorage.getItem(syncQueueKey(driverId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(driverId, queue) {
  try {
    localStorage.setItem(syncQueueKey(driverId), JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function enqueueWalkaroundSubmission(driverId, payload) {
  const queue = loadSyncQueue(driverId);
  queue.push({
    id: `pending-${Date.now()}`,
    createdAt: new Date().toISOString(),
    payload,
  });
  saveSyncQueue(driverId, queue);
  return queue.length;
}

export function dequeueWalkaroundSubmission(driverId, pendingId) {
  const queue = loadSyncQueue(driverId).filter((item) => item.id !== pendingId);
  saveSyncQueue(driverId, queue);
  return queue;
}
