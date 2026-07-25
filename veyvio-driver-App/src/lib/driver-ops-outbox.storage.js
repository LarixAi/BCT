import { driverWorkspaceStorageKey } from "@/lib/driver-workspace-storage";

const LEGACY_QUEUE_PREFIX = "csf_driver_ops_outbox:";

export function opsOutboxKey(driverId, companyId, membershipId) {
  if (companyId && membershipId) {
    return driverWorkspaceStorageKey(companyId, membershipId, "ops-command-outbox");
  }
  return `${LEGACY_QUEUE_PREFIX}${driverId}`;
}

export function loadOpsOutbox(driverId, companyId, membershipId) {
  try {
    const raw = localStorage.getItem(opsOutboxKey(driverId, companyId, membershipId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOpsOutbox(driverId, queue, companyId, membershipId) {
  try {
    localStorage.setItem(opsOutboxKey(driverId, companyId, membershipId), JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function enqueueOpsCommand(driverId, entry, companyId, membershipId) {
  const id = entry.id ?? `ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const queue = loadOpsOutbox(driverId, companyId, membershipId);
  const payload = {
    ...(entry.payload ?? {}),
    clientId: entry.payload?.clientId ?? id,
  };
  queue.push({
    id,
    createdAt: new Date().toISOString(),
    type: entry.type,
    companyId: companyId ?? null,
    membershipId: membershipId ?? null,
    payload,
  });
  saveOpsOutbox(driverId, queue, companyId, membershipId);
  return queue.length;
}

export function dequeueOpsCommand(driverId, pendingId, companyId, membershipId) {
  const queue = loadOpsOutbox(driverId, companyId, membershipId).filter((item) => item.id !== pendingId);
  saveOpsOutbox(driverId, queue, companyId, membershipId);
  return queue;
}

/** Replace any pending duty sign-on/off for the same duty before enqueueing. */
export function enqueueDutyOpsCommand(driverId, type, dutyId, companyId, membershipId) {
  const dutyKey = String(dutyId);
  const id = `duty-${type}-${dutyKey}`;
  const queue = loadOpsOutbox(driverId, companyId, membershipId).filter(
    (item) => !(item.type === type && String(item.payload?.dutyId ?? "") === dutyKey),
  );
  queue.push({
    id,
    createdAt: new Date().toISOString(),
    type,
    companyId: companyId ?? null,
    membershipId: membershipId ?? null,
    payload: { dutyId: dutyKey, clientId: id },
  });
  saveOpsOutbox(driverId, queue, companyId, membershipId);
  return queue.length;
}

export function hasPendingDutyOps(driverId, dutyId, companyId, membershipId) {
  const dutyKey = String(dutyId);
  return loadOpsOutbox(driverId, companyId, membershipId).some(
    (item) =>
      (item.type === "duty_sign_on" || item.type === "duty_sign_off") &&
      String(item.payload?.dutyId ?? "") === dutyKey,
  );
}
