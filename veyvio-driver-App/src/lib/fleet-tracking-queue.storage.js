import { durableGet, durablePut, DurableStorageError } from "@/lib/driver-durable-kv"
import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage"

export const LEGACY_QUEUE_PREFIX = "csf_fleet_tracking_ping_queue:"

export function fleetPingQueueKey(driverId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  return driverWorkspaceStorageKey(companyId, membershipId, "fleet-ping-queue")
}

function readLegacyLocalQueue(key) {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    throw new DurableStorageError("CORRUPT_OUTBOX", "Queued location pings could not be read. They were not discarded.")
  }
}

async function loadQueueRecord(driverId, companyId, membershipId) {
  const key = fleetPingQueueKey(driverId, companyId, membershipId)
  const stored = await durableGet(key)
  if (stored.found) {
    const items = stored.value?.items
    if (!Array.isArray(items)) {
      throw new DurableStorageError("CORRUPT_OUTBOX", "Queued location pings could not be read. They were not discarded.")
    }
    return { key, items }
  }
  const scoped = readLegacyLocalQueue(key)
  const legacy = driverId ? readLegacyLocalQueue(`${LEGACY_QUEUE_PREFIX}${driverId}`) : []
  const migrated = [...scoped, ...legacy]
  if (migrated.length) {
    await durablePut(key, { items: migrated, migratedAt: new Date().toISOString() })
    try {
      localStorage.removeItem(key)
      if (driverId) localStorage.removeItem(`${LEGACY_QUEUE_PREFIX}${driverId}`)
    } catch {
      /* leftover backup */
    }
  }
  return { key, items: migrated }
}

export async function loadFleetPingQueue(driverId, companyId, membershipId) {
  const { items } = await loadQueueRecord(driverId, companyId, membershipId)
  return items
}

export async function saveFleetPingQueue(driverId, queue, companyId, membershipId) {
  const key = fleetPingQueueKey(driverId, companyId, membershipId)
  await durablePut(key, { items: queue, updatedAt: new Date().toISOString() })
}

export async function enqueueFleetPing(driverId, payload, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  items.push({
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    companyId,
    membershipId,
    payload,
  })
  await durablePut(key, { items, updatedAt: new Date().toISOString() })
  return items.length
}

export async function dequeueFleetPing(driverId, pendingId, companyId, membershipId) {
  const { key, items } = await loadQueueRecord(driverId, companyId, membershipId)
  const next = items.filter((item) => item.id !== pendingId)
  await durablePut(key, { items: next, updatedAt: new Date().toISOString() })
  return next
}

export async function clearFleetPingQueue(driverId, companyId, membershipId) {
  await saveFleetPingQueue(driverId, [], companyId, membershipId)
}
