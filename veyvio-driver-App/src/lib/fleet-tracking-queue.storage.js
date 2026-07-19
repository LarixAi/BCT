const QUEUE_PREFIX = "csf_fleet_tracking_ping_queue:";

export function fleetPingQueueKey(driverId) {
  return `${QUEUE_PREFIX}${driverId}`;
}

export function loadFleetPingQueue(driverId) {
  try {
    const raw = localStorage.getItem(fleetPingQueueKey(driverId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFleetPingQueue(driverId, queue) {
  try {
    localStorage.setItem(fleetPingQueueKey(driverId), JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function enqueueFleetPing(driverId, payload) {
  const queue = loadFleetPingQueue(driverId);
  queue.push({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    payload,
  });
  saveFleetPingQueue(driverId, queue);
  return queue.length;
}

export function dequeueFleetPing(driverId, pendingId) {
  const queue = loadFleetPingQueue(driverId).filter((item) => item.id !== pendingId);
  saveFleetPingQueue(driverId, queue);
  return queue;
}

export function clearFleetPingQueue(driverId) {
  saveFleetPingQueue(driverId, []);
}
