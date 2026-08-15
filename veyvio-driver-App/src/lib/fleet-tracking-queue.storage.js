import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage"
import {
  ITEM_PENDING,
  QUEUE_FLEET,
  deleteQueueItem,
  listQueueItems,
  migrateLegacyQueues,
  putQueueItem,
  workspaceProvenance,
} from "@/lib/driver-durable-queue"

export const LEGACY_QUEUE_PREFIX = "csf_fleet_tracking_ping_queue:"

export function fleetPingQueueKey(driverId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  return driverWorkspaceStorageKey(companyId, membershipId, "fleet-ping-queue")
}

async function ensureMigrated(driverId, companyId, membershipId, userId) {
  await migrateLegacyQueues({
    driverId,
    companyId,
    membershipId,
    queueType: QUEUE_FLEET,
    scopedLocalKey: fleetPingQueueKey(driverId, companyId, membershipId),
    driverLocalPrefix: LEGACY_QUEUE_PREFIX,
    kvKey: fleetPingQueueKey(driverId, companyId, membershipId),
    proof: workspaceProvenance(driverId, companyId, membershipId, userId),
  })
}

export async function loadFleetPingQueue(driverId, companyId, membershipId, userId = null) {
  await ensureMigrated(driverId, companyId, membershipId, userId)
  return listQueueItems(companyId, membershipId, QUEUE_FLEET)
}

export async function saveFleetPingQueue(driverId, queue, companyId, membershipId) {
  const existing = await loadFleetPingQueue(driverId, companyId, membershipId)
  const keep = new Set((queue ?? []).map((item) => item.id))
  for (const item of existing) {
    if (!keep.has(item.id)) await deleteQueueItem(companyId, membershipId, QUEUE_FLEET, item.id)
  }
  for (const item of queue ?? []) {
    await putQueueItem({
      ...item,
      queueType: QUEUE_FLEET,
      companyId,
      membershipId,
      driverId: item.driverId ?? driverId,
    })
  }
}

export async function enqueueFleetPing(driverId, payload, companyId, membershipId, userId = null) {
  requireWorkspaceIds(companyId, membershipId)
  await ensureMigrated(driverId, companyId, membershipId, userId)
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await putQueueItem({
    id,
    createdAt: new Date().toISOString(),
    companyId,
    membershipId,
    driverId,
    queueType: QUEUE_FLEET,
    status: ITEM_PENDING,
    payload,
  })
  return (await listQueueItems(companyId, membershipId, QUEUE_FLEET)).length
}

export async function dequeueFleetPing(driverId, pendingId, companyId, membershipId) {
  await deleteQueueItem(companyId, membershipId, QUEUE_FLEET, pendingId)
  return listQueueItems(companyId, membershipId, QUEUE_FLEET)
}

export async function clearFleetPingQueue(driverId, companyId, membershipId) {
  await saveFleetPingQueue(driverId, [], companyId, membershipId)
}
