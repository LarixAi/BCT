import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage"
import {
  ITEM_PENDING,
  ITEM_RECONCILIATION,
  QUEUE_WALKAROUND,
  deleteQueueItem,
  listQueueItems,
  migrateLegacyQueues,
  patchQueueItem,
  putQueueItem,
  workspaceProvenance,
} from "@/lib/driver-durable-queue"

export const LEGACY_WALKAROUND_QUEUE_PREFIX = "csf_walkaround_sync_queue:"

export function syncQueueKey(driverId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  return driverWorkspaceStorageKey(companyId, membershipId, "walkaround-sync-queue")
}

async function ensureMigrated(driverId, companyId, membershipId, userId) {
  await migrateLegacyQueues({
    driverId,
    companyId,
    membershipId,
    queueType: QUEUE_WALKAROUND,
    scopedLocalKey: syncQueueKey(driverId, companyId, membershipId),
    driverLocalPrefix: LEGACY_WALKAROUND_QUEUE_PREFIX,
    kvKey: syncQueueKey(driverId, companyId, membershipId),
    proof: workspaceProvenance(driverId, companyId, membershipId, userId),
  })
}

export async function loadSyncQueue(driverId, companyId, membershipId, userId = null) {
  await ensureMigrated(driverId, companyId, membershipId, userId)
  return listQueueItems(companyId, membershipId, QUEUE_WALKAROUND)
}

export async function saveSyncQueue(driverId, queue, companyId, membershipId) {
  const existing = await loadSyncQueue(driverId, companyId, membershipId)
  const keep = new Set((queue ?? []).map((item) => item.id))
  for (const item of existing) {
    if (!keep.has(item.id)) await deleteQueueItem(companyId, membershipId, QUEUE_WALKAROUND, item.id)
  }
  for (const item of queue ?? []) {
    await putQueueItem({
      ...item,
      queueType: QUEUE_WALKAROUND,
      companyId,
      membershipId,
      driverId: item.driverId ?? driverId,
    })
  }
  return queue
}

export async function enqueueWalkaroundSubmission(driverId, payload, companyId, membershipId, userId = null) {
  requireWorkspaceIds(companyId, membershipId)
  await ensureMigrated(driverId, companyId, membershipId, userId)
  const id = payload?.clientId ?? payload?.clientCheckId ?? `pending-${Date.now()}`
  await putQueueItem({
    id,
    createdAt: new Date().toISOString(),
    companyId,
    membershipId,
    driverId,
    queueType: QUEUE_WALKAROUND,
    status: ITEM_PENDING,
    idempotencyKey: payload?.clientId ?? payload?.clientCheckId ?? id,
    payload,
  })
  return (await listQueueItems(companyId, membershipId, QUEUE_WALKAROUND)).length
}

export async function dequeueWalkaroundSubmission(driverId, pendingId, companyId, membershipId) {
  await deleteQueueItem(companyId, membershipId, QUEUE_WALKAROUND, pendingId)
  return listQueueItems(companyId, membershipId, QUEUE_WALKAROUND)
}

export async function markWalkaroundReconciliation(driverId, pendingId, companyId, membershipId, errorMeta = {}) {
  return patchQueueItem(companyId, membershipId, QUEUE_WALKAROUND, pendingId, {
    status: ITEM_RECONCILIATION,
    lastError: errorMeta,
    lastAttemptedAt: new Date().toISOString(),
  })
}

export function isWalkaroundAutoReplayEligible(item) {
  return (item?.status ?? ITEM_PENDING) !== ITEM_RECONCILIATION
}
