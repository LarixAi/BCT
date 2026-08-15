import {
  DurableStorageError,
  KV_STORE,
  QUEUE_ITEMS_STORE,
  durableDelete,
  durableGet,
  durableListByPrefix,
  durablePut,
} from "@/lib/driver-durable-kv"
import { requireWorkspaceIds } from "@/lib/driver-workspace-storage"

export const QUEUE_OPS = "ops"
export const QUEUE_WALKAROUND = "walkaround"
export const QUEUE_FLEET = "fleet"

export const ITEM_PENDING = "PENDING"
export const ITEM_RETRYABLE = "RETRYABLE_FAILURE"
export const ITEM_RECONCILIATION = "RECONCILIATION_REQUIRED"
export const ITEM_MIGRATION_REVIEW = "MIGRATION_REVIEW_REQUIRED"

function queuePrefix(companyId, membershipId, queueType) {
  const scope = requireWorkspaceIds(companyId, membershipId)
  return `qi|${scope.companyId}|${scope.membershipId}|${queueType}|`
}

export function queueItemKey(companyId, membershipId, queueType, mutationId) {
  return `${queuePrefix(companyId, membershipId, queueType)}${mutationId}`
}

function reviewKey(driverId, queueType, mutationId) {
  return `qi|review|${driverId || "unknown"}|${queueType}|${mutationId}`
}

function itemIdentity(item) {
  return String(item?.idempotencyKey ?? item?.payload?.clientId ?? item?.id ?? "")
}

export function dedupeQueueItems(items) {
  const seen = new Set()
  const next = []
  for (const item of items) {
    const identity = itemIdentity(item)
    const key = identity || `anon-${next.length}`
    if (seen.has(key)) continue
    seen.add(key)
    next.push(item)
  }
  return next
}

/**
 * Adopt only when the item already matches this tenant, or unscoped legacy
 * can be proven: same driverId and Command-backed membership for this user+company.
 */
export function classifyLegacyQueueItem(item, proof) {
  const companyId = String(proof?.companyId ?? "")
  const membershipId = String(proof?.membershipId ?? "")
  const driverId = String(proof?.driverId ?? "")
  const itemCompany = String(item?.companyId ?? "").trim()
  const itemMembership = String(item?.membershipId ?? "").trim()
  const itemDriver = String(item?.driverId ?? "").trim()

  if (!proof?.membershipBelongsToUserAndCompany || !proof?.driverBelongsToCompany) {
    return "quarantine"
  }
  if (itemCompany || itemMembership) {
    if (itemCompany === companyId && itemMembership === membershipId) return "adopt"
    return "quarantine"
  }
  if (itemDriver && itemDriver !== driverId) return "quarantine"
  if (!itemDriver && !driverId) return "quarantine"
  if (driverId && proof.legacyQueueDriverId && proof.legacyQueueDriverId !== driverId) return "quarantine"
  return "adopt"
}

function readLegacyLocalQueue(key) {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    throw new DurableStorageError(
      "CORRUPT_OUTBOX",
      "Queued work on this device could not be read. It was not discarded.",
    )
  }
}

async function persistItemRecord(record) {
  const key = queueItemKey(record.companyId, record.membershipId, record.queueType, record.id)
  await durablePut(key, record, QUEUE_ITEMS_STORE)
  return record
}

async function persistReviewRecord(record) {
  const key = reviewKey(record.driverId, record.queueType, record.id)
  await durablePut(key, { ...record, status: ITEM_MIGRATION_REVIEW }, QUEUE_ITEMS_STORE)
  return record
}

export async function listQueueItems(companyId, membershipId, queueType) {
  const prefix = queuePrefix(companyId, membershipId, queueType)
  const rows = await durableListByPrefix(prefix, QUEUE_ITEMS_STORE)
  return rows.map((row) => row.value)
}

export async function putQueueItem(record) {
  requireWorkspaceIds(record.companyId, record.membershipId)
  return persistItemRecord(record)
}

export async function deleteQueueItem(companyId, membershipId, queueType, mutationId) {
  await durableDelete(queueItemKey(companyId, membershipId, queueType, mutationId), QUEUE_ITEMS_STORE)
}

export async function patchQueueItem(companyId, membershipId, queueType, mutationId, patch) {
  const key = queueItemKey(companyId, membershipId, queueType, mutationId)
  const stored = await durableGet(key, QUEUE_ITEMS_STORE)
  if (!stored.found) {
    throw new DurableStorageError("CORRUPT_OUTBOX", "Queued work on this device could not be read. It was not discarded.")
  }
  const next = { ...stored.value, ...patch }
  await durablePut(key, next, QUEUE_ITEMS_STORE)
  return next
}

async function migrateKvArray(legacyKvKey, companyId, membershipId, queueType, proof) {
  const stored = await durableGet(legacyKvKey, KV_STORE)
  if (!stored.found) return
  const items = stored.value?.items
  if (!Array.isArray(items)) {
    throw new DurableStorageError(
      "CORRUPT_OUTBOX",
      "Queued work on this device could not be read. It was not discarded.",
    )
  }
  await importLegacyItems(items, { companyId, membershipId, queueType, proof, legacyQueueDriverId: proof?.driverId })
  await durableDelete(legacyKvKey, KV_STORE)
}

async function importLegacyItems(items, { companyId, membershipId, queueType, proof, legacyQueueDriverId }) {
  const classified = []
  for (const item of items) {
    const decision = classifyLegacyQueueItem(item, { ...proof, companyId, membershipId, legacyQueueDriverId })
    classified.push({ item, decision })
  }
  const adopted = dedupeQueueItems(
    classified.filter((row) => row.decision === "adopt").map((row) => row.item),
  )
  const quarantined = classified.filter((row) => row.decision === "quarantine").map((row) => row.item)

  for (const item of adopted) {
    const id = item.id ?? item.idempotencyKey ?? item.payload?.clientId ?? `ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await persistItemRecord({
      ...item,
      id,
      companyId,
      membershipId,
      driverId: item.driverId ?? proof?.driverId ?? null,
      queueType,
      status: item.status ?? ITEM_PENDING,
      mutationVersion: item.mutationVersion ?? 1,
      idempotencyKey: item.idempotencyKey ?? item.payload?.clientId ?? id,
    })
  }
  for (const item of quarantined) {
    const id = item.id ?? item.idempotencyKey ?? `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await persistReviewRecord({
      ...item,
      id,
      queueType,
      driverId: item.driverId ?? legacyQueueDriverId ?? proof?.driverId ?? null,
      sourceCompanyId: item.companyId ?? null,
      sourceMembershipId: item.membershipId ?? null,
    })
  }
}

export async function migrateLegacyQueues({
  driverId,
  companyId,
  membershipId,
  queueType,
  scopedLocalKey,
  driverLocalPrefix,
  kvKey,
  proof,
}) {
  await migrateKvArray(kvKey, companyId, membershipId, queueType, proof)

  const scoped = scopedLocalKey ? readLegacyLocalQueue(scopedLocalKey) : []
  const driverLegacy = driverId && driverLocalPrefix ? readLegacyLocalQueue(`${driverLocalPrefix}${driverId}`) : []
  if (scoped.length || driverLegacy.length) {
    await importLegacyItems(scoped, {
      companyId,
      membershipId,
      queueType,
      proof,
      legacyQueueDriverId: driverId,
    })
    await importLegacyItems(driverLegacy, {
      companyId,
      membershipId,
      queueType,
      proof: { ...proof, legacyQueueDriverId: driverId },
      legacyQueueDriverId: driverId,
    })
    try {
      if (scopedLocalKey) localStorage.removeItem(scopedLocalKey)
      if (driverId && driverLocalPrefix) localStorage.removeItem(`${driverLocalPrefix}${driverId}`)
    } catch {
      /* leftover backup */
    }
  }
}

export function workspaceProvenance(driverId, companyId, membershipId, userId = null) {
  const company = String(companyId ?? "").trim()
  const membership = String(membershipId ?? "").trim()
  const driver = String(driverId ?? "").trim()
  const user = String(userId ?? "").trim()
  return {
    driverId: driver,
    companyId: company,
    membershipId: membership,
    userId: user || null,
    driverBelongsToCompany: Boolean(driver && company && membership),
    membershipBelongsToUserAndCompany: Boolean(company && membership && membership !== user && membership !== driver),
  }
}
