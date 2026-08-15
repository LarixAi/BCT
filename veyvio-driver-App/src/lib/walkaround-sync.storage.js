import { durableGet, durablePut, DurableStorageError } from "@/lib/driver-durable-kv"
import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage"

export const LEGACY_WALKAROUND_QUEUE_PREFIX = "csf_walkaround_sync_queue:"

export function syncQueueKey(driverId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  return driverWorkspaceStorageKey(companyId, membershipId, "walkaround-sync-queue")
}

function readLegacyLocalQueue(key) {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    throw new DurableStorageError("CORRUPT_OUTBOX", "Queued vehicle checks could not be read. They were not discarded.")
  }
}

async function loadQueueRecord(driverId, companyId, membershipId) {
  const key = syncQueueKey(driverId, companyId, membershipId)
  const stored = await durableGet(key)
  if (stored.found) {
    const items = stored.value?.items
    if (!Array.isArray(items)) {
      throw new DurableStorageError("CORRUPT_OUTBOX", "Queued vehicle checks could not be read. They were not discarded.")
    }
    return { key, items }
  }
  const scoped = readLegacyLocalQueue(key)
  const legacy = driverId ? readLegacyLocalQueue(`${LEGACY_WALKAROUND_QUEUE_PREFIX}${driverId}`) : []
  const migrated = [...scoped, ...legacy].map((item) => ({
    ...item,
    companyId: item.companyId ?? companyId,
    membershipId: item.membershipId ?? membershipId,
    status: item.status ?? "PENDING",
  }))
  if (migrated.length) {
    await durablePut(key, { items: migrated, migratedAt: new Date().toISOString() })
    try {
      localStorage.removeItem(key)
      if (driverId) localStorage.removeItem(`${LEGACY_WALKAROUND_QUEUE_PREFIX}${driverId}`)
    } catch {
      /* keep leftover */
    }
  }
  return { key, items: migrated }
}

export async function loadSyncQueue(driverId, companyId, membershipId) {
  const { items } = await loadQueueRecord(driverId, companyId, membershipId)
  return items
}

export async function saveSyncQueue(driverId, queue, companyId, membershipId) {
  const key = syncQueueKey(driverId, companyId, membershipId)
  await durablePut(key, { items: queue, updatedAt: new Date().toISOString() })
  return queue
}

export async function enqueueWalkaroundSubmission(driverId, payload, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  items.push({
    id: payload?.clientId ?? `pending-${Date.now()}`,
    createdAt: new Date().toISOString(),
    companyId,
    membershipId,
    status: "PENDING",
    idempotencyKey: payload?.clientId ?? payload?.clientCheckId ?? null,
    payload,
  })
  await durablePut(key, { items, updatedAt: new Date().toISOString() })
  return items.length
}

export async function dequeueWalkaroundSubmission(driverId, pendingId, companyId, membershipId) {
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.filter((item) => item.id !== pendingId)
  await durablePut(key, { items: next, updatedAt: new Date().toISOString() })
  return next
}

export async function markWalkaroundReconciliation(driverId, pendingId, companyId, membershipId, errorMeta = {}) {
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.map((item) =>
    item.id === pendingId
      ? { ...item, status: "RECONCILIATION_REQUIRED", lastError: errorMeta, lastAttemptedAt: new Date().toISOString() }
      : item,
  )
  await durablePut(key, { items: next, updatedAt: new Date().toISOString() })
  return next
}
