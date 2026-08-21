import { driverWorkspaceStorageKey, requireWorkspaceIds } from "@/lib/driver-workspace-storage"
import {
  ITEM_PENDING,
  ITEM_RECONCILIATION,
  ITEM_RETRYABLE,
  QUEUE_OPS,
  deleteQueueItem,
  listQueueItems,
  migrateLegacyQueues,
  patchQueueItem,
  putQueueItem,
  workspaceProvenance,
} from "@/lib/driver-durable-queue"

export const OPS_ITEM_PENDING = ITEM_PENDING
export const OPS_ITEM_RETRYABLE = ITEM_RETRYABLE
export const OPS_ITEM_RECONCILIATION = ITEM_RECONCILIATION
export const LEGACY_OPS_QUEUE_PREFIX = "csf_driver_ops_outbox:"

export function opsOutboxKey(driverId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  return driverWorkspaceStorageKey(companyId, membershipId, "ops-command-outbox")
}

function proofFor(driverId, companyId, membershipId, userId) {
  return workspaceProvenance(driverId, companyId, membershipId, userId)
}

async function ensureMigrated(driverId, companyId, membershipId, userId) {
  await migrateLegacyQueues({
    driverId,
    companyId,
    membershipId,
    queueType: QUEUE_OPS,
    scopedLocalKey: opsOutboxKey(driverId, companyId, membershipId),
    driverLocalPrefix: LEGACY_OPS_QUEUE_PREFIX,
    kvKey: opsOutboxKey(driverId, companyId, membershipId),
    proof: proofFor(driverId, companyId, membershipId, userId),
  })
}

export async function loadOpsOutbox(driverId, companyId, membershipId, userId = null) {
  await ensureMigrated(driverId, companyId, membershipId, userId)
  return listQueueItems(companyId, membershipId, QUEUE_OPS)
}

export async function saveOpsOutbox(driverId, queue, companyId, membershipId) {
  const existing = await loadOpsOutbox(driverId, companyId, membershipId)
  const keep = new Set((queue ?? []).map((item) => item.id))
  for (const item of existing) {
    if (!keep.has(item.id)) {
      await deleteQueueItem(companyId, membershipId, QUEUE_OPS, item.id)
    }
  }
  for (const item of queue ?? []) {
    await putQueueItem({ ...item, queueType: QUEUE_OPS, companyId, membershipId, driverId: item.driverId ?? driverId })
  }
  return queue
}

export async function enqueueOpsCommand(driverId, entry, companyId, membershipId, userId = null) {
  requireWorkspaceIds(companyId, membershipId)
  await ensureMigrated(driverId, companyId, membershipId, userId)
  const id = entry.id ?? `ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    ...(entry.payload ?? {}),
    clientId: entry.payload?.clientId ?? id,
  }
  await putQueueItem({
    id,
    createdAt: new Date().toISOString(),
    type: entry.type,
    queueType: QUEUE_OPS,
    companyId,
    membershipId,
    driverId: driverId ?? null,
    status: ITEM_PENDING,
    mutationVersion: 1,
    idempotencyKey: payload.clientId,
    payload,
  })
  return (await listQueueItems(companyId, membershipId, QUEUE_OPS)).length
}

export async function dequeueOpsCommand(driverId, pendingId, companyId, membershipId) {
  await deleteQueueItem(companyId, membershipId, QUEUE_OPS, pendingId)
  return listQueueItems(companyId, membershipId, QUEUE_OPS)
}

export async function markOpsCommandReconciliation(driverId, pendingId, companyId, membershipId, errorMeta = {}) {
  return patchQueueItem(companyId, membershipId, QUEUE_OPS, pendingId, {
    status: ITEM_RECONCILIATION,
    lastAttemptedAt: new Date().toISOString(),
    lastError: errorMeta,
  })
}

export async function markOpsCommandRetryable(driverId, pendingId, companyId, membershipId, errorMeta = {}) {
  const current = (await listQueueItems(companyId, membershipId, QUEUE_OPS)).find((item) => item.id === pendingId)
  return patchQueueItem(companyId, membershipId, QUEUE_OPS, pendingId, {
    status: ITEM_RETRYABLE,
    lastAttemptedAt: new Date().toISOString(),
    lastError: errorMeta,
    retryCount: Number(current?.retryCount ?? 0) + 1,
  })
}

export async function revalidateOpsCommand(driverId, pendingId, companyId, membershipId) {
  requireWorkspaceIds(companyId, membershipId)
  const current = (await listQueueItems(companyId, membershipId, QUEUE_OPS)).find((item) => item.id === pendingId)
  if (!current) {
    throw new Error("That saved report is not in this workspace.")
  }
  if (current.status !== ITEM_RECONCILIATION) return current
  return patchQueueItem(companyId, membershipId, QUEUE_OPS, pendingId, {
    status: ITEM_PENDING,
    revalidatedAt: new Date().toISOString(),
    revalidationCount: Number(current.revalidationCount ?? 0) + 1,
  })
}

export async function enqueueDutyOpsCommand(driverId, type, dutyId, companyId, membershipId, userId = null) {
  requireWorkspaceIds(companyId, membershipId)
  await ensureMigrated(driverId, companyId, membershipId, userId)
  const dutyKey = String(dutyId)
  const id = `duty-${type}-${dutyKey}`
  await putQueueItem({
    id,
    createdAt: new Date().toISOString(),
    type,
    queueType: QUEUE_OPS,
    companyId,
    membershipId,
    driverId: driverId ?? null,
    status: ITEM_PENDING,
    mutationVersion: 1,
    idempotencyKey: id,
    payload: { dutyId: dutyKey, clientId: id },
  })
  return (await listQueueItems(companyId, membershipId, QUEUE_OPS)).length
}

export async function hasPendingDutyOps(driverId, dutyId, companyId, membershipId) {
  const dutyKey = String(dutyId)
  const items = await loadOpsOutbox(driverId, companyId, membershipId)
  return items.some(
    (item) =>
      (item.type === "duty_sign_on" || item.type === "duty_sign_off") &&
      String(item.payload?.dutyId ?? "") === dutyKey &&
      item.status !== ITEM_RECONCILIATION,
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

export function isAutoReplayEligible(item) {
  const status = item?.status ?? ITEM_PENDING
  return status === ITEM_PENDING || status === ITEM_RETRYABLE
}
