import { durableGet, durablePut, DurableStorageError } from "@/lib/driver-durable-kv"
import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage"

export const OPS_ITEM_PENDING = "PENDING"
export const OPS_ITEM_RETRYABLE = "RETRYABLE_FAILURE"
export const OPS_ITEM_RECONCILIATION = "RECONCILIATION_REQUIRED"

export const LEGACY_OPS_QUEUE_PREFIX = "csf_driver_ops_outbox:"

export function opsOutboxKey(driverId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  return driverWorkspaceStorageKey(companyId, membershipId, "ops-command-outbox")
}

function readLegacyLocalQueue(key) {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    throw new DurableStorageError("CORRUPT_OUTBOX", "Queued work on this device could not be read. It was not discarded.")
  }
}

async function loadQueueRecord(driverId, companyId, membershipId) {
  const key = opsOutboxKey(driverId, companyId, membershipId)
  const stored = await durableGet(key)
  if (stored.found) {
    const items = stored.value?.items
    if (!Array.isArray(items)) {
      throw new DurableStorageError("CORRUPT_OUTBOX", "Queued work on this device could not be read. It was not discarded.")
    }
    return { key, items }
  }

  const scopedLegacy = readLegacyLocalQueue(key)
  const driverLegacy = driverId ? readLegacyLocalQueue(`${LEGACY_OPS_QUEUE_PREFIX}${driverId}`) : []
  const migrated = [...scopedLegacy, ...driverLegacy].map((item) => ({
    ...item,
    companyId: item.companyId ?? companyId,
    membershipId: item.membershipId ?? membershipId,
    status: item.status ?? OPS_ITEM_PENDING,
    mutationVersion: item.mutationVersion ?? 1,
  }))
  if (migrated.length) {
    await durablePut(key, { items: migrated, migratedAt: new Date().toISOString() })
    try {
      localStorage.removeItem(key)
      if (driverId) localStorage.removeItem(`${LEGACY_OPS_QUEUE_PREFIX}${driverId}`)
    } catch {
      /* backup copy may remain */
    }
  }
  return { key, items: migrated }
}

async function persistQueue(key, items) {
  await durablePut(key, { items, updatedAt: new Date().toISOString() })
  return items
}

export async function loadOpsOutbox(driverId, companyId, membershipId) {
  const { items } = await loadQueueRecord(driverId, companyId, membershipId)
  return items
}

export async function saveOpsOutbox(driverId, queue, companyId, membershipId) {
  const key = opsOutboxKey(driverId, companyId, membershipId)
  await persistQueue(key, queue)
  return queue
}

export async function enqueueOpsCommand(driverId, entry, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const id = entry.id ?? `ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    ...(entry.payload ?? {}),
    clientId: entry.payload?.clientId ?? id,
  }
  items.push({
    id,
    createdAt: new Date().toISOString(),
    type: entry.type,
    companyId,
    membershipId,
    driverId: driverId ?? null,
    status: OPS_ITEM_PENDING,
    mutationVersion: 1,
    idempotencyKey: payload.clientId,
    payload,
  })
  await persistQueue(key, items)
  return items.length
}

export async function dequeueOpsCommand(driverId, pendingId, companyId, membershipId) {
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.filter((item) => item.id !== pendingId)
  await persistQueue(key, next)
  return next
}

export async function markOpsCommandReconciliation(driverId, pendingId, companyId, membershipId, errorMeta = {}) {
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.map((item) =>
    item.id === pendingId
      ? {
          ...item,
          status: OPS_ITEM_RECONCILIATION,
          lastAttemptedAt: new Date().toISOString(),
          lastError: errorMeta,
          retryCount: Number(item.retryCount ?? 0) + 1,
        }
      : item,
  )
  await persistQueue(key, next)
  return next
}

export async function markOpsCommandRetryable(driverId, pendingId, companyId, membershipId, errorMeta = {}) {
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.map((item) =>
    item.id === pendingId
      ? {
          ...item,
          status: OPS_ITEM_RETRYABLE,
          lastAttemptedAt: new Date().toISOString(),
          lastError: errorMeta,
          retryCount: Number(item.retryCount ?? 0) + 1,
        }
      : item,
  )
  await persistQueue(key, next)
  return next
}

export async function enqueueDutyOpsCommand(driverId, type, dutyId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  const dutyKey = String(dutyId)
  const id = `duty-${type}-${dutyKey}`
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.filter((item) => !(item.type === type && String(item.payload?.dutyId ?? "") === dutyKey))
  next.push({
    id,
    createdAt: new Date().toISOString(),
    type,
    companyId,
    membershipId,
    driverId: driverId ?? null,
    status: OPS_ITEM_PENDING,
    mutationVersion: 1,
    idempotencyKey: id,
    payload: { dutyId: dutyKey, clientId: id },
  })
  await persistQueue(key, next)
  return next.length
}

export async function hasPendingDutyOps(driverId, dutyId, companyId, membershipId) {
  const dutyKey = String(dutyId)
  const items = await loadOpsOutbox(driverId, companyId, membershipId)
  return items.some(
    (item) =>
      (item.type === "duty_sign_on" || item.type === "duty_sign_off") &&
      String(item.payload?.dutyId ?? "") === dutyKey &&
      item.status !== OPS_ITEM_RECONCILIATION,
  )
}

export async function listPendingMessageOps(driverId, companyId, membershipId, conversationId = null) {
  const items = await loadOpsOutbox(driverId, companyId, membershipId)
  return items.filter((item) => {
    if (item.type !== "message_start" && item.type !== "message_reply") return false
    if (!conversationId) return true
    if (item.type === "message_reply") {
      return String(item.payload?.conversationId ?? "") === String(conversationId)
    }
    return false
  })
}
