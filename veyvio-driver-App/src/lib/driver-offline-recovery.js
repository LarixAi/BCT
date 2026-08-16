/**
 * Last-verified Driver recovery context in existing veyvio_driver_durable KV.
 * Reveals already-saved local work after process death when Command is unreachable.
 * Never stores credentials and never grants fresh operational authority.
 */
import { durableDelete, durableGet, durablePut } from "@/lib/driver-durable-kv"
import { ITEM_PENDING, ITEM_RECONCILIATION, QUEUE_OPS, QUEUE_WALKAROUND, listQueueItems } from "@/lib/driver-durable-queue"
import { hasWalkaroundMediaRecord } from "@/lib/walkaround-media-outbox"

export const RECOVERY_CONTEXT_KEY = "drv|last-verified-context"
export const RECOVERY_CONTEXT_VERSION = 1
/** Cached identity may recover saved work for 14 days — not live eligibility. */
export const RECOVERY_CONTEXT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000
export const OFFLINE_RECOVERY_ROUTE = "offline_recovery"

const CREDENTIAL_PATTERN = /access[_-]?token|refresh[_-]?token|password|totp|secret|authorization|bearer/i

function trim(value) {
  return String(value ?? "").trim()
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trim(value))
}

export function recoveryContextContainsCredentials(value) {
  try {
    return CREDENTIAL_PATTERN.test(JSON.stringify(value))
  } catch {
    return true
  }
}

export function sanitizeVerifiedRecoveryContext(input, now = new Date()) {
  const userId = trim(input?.userId)
  const companyId = trim(input?.companyId ?? input?.organisationId)
  const membershipId = trim(input?.membershipId)
  const driverId = trim(input?.driverId ?? input?.driver?.id)
  const displayName = trim(input?.displayName ?? input?.driver?.fullName ?? input?.driver?.full_name)
  const organisationName = trim(
    input?.organisationName ?? input?.driver?.organisationName ?? input?.organisation_name,
  )
  const accountStatusLabel = trim(input?.accountStatusLabel ?? input?.accountStatus ?? "")

  if (!userId || !companyId || !membershipId || !driverId) return null
  if (!isUuidLike(userId) || !isUuidLike(companyId) || !isUuidLike(membershipId) || !isUuidLike(driverId)) return null
  if (membershipId === userId || membershipId === driverId || membershipId === companyId) return null

  const sanitized = {
    version: RECOVERY_CONTEXT_VERSION,
    userId,
    companyId,
    membershipId,
    driverId,
    verifiedAt: now.toISOString(),
    displayName: displayName || "Driver",
    organisationName: organisationName || "",
    accountStatusLabel: accountStatusLabel || "last verified",
  }
  if (recoveryContextContainsCredentials(sanitized)) return null
  return sanitized
}

export async function saveVerifiedRecoveryContext(liveSession, now = new Date()) {
  const sanitized = sanitizeVerifiedRecoveryContext(
    {
      userId: liveSession?.userId,
      companyId: liveSession?.organisationId ?? liveSession?.companyId,
      membershipId: liveSession?.membershipId,
      driverId: liveSession?.driverId ?? liveSession?.driver?.id,
      displayName: liveSession?.driver?.fullName ?? liveSession?.driver?.full_name,
      organisationName: liveSession?.organisationName ?? liveSession?.driver?.organisationName,
      accountStatusLabel: liveSession?.accountStatus,
    },
    now,
  )
  if (!sanitized) {
    return { ok: false, reason: "malformed" }
  }
  await durablePut(RECOVERY_CONTEXT_KEY, sanitized)
  return { ok: true, context: sanitized }
}

export async function clearVerifiedRecoveryContext() {
  await durableDelete(RECOVERY_CONTEXT_KEY)
}

export function isRecoveryContextAcceptable(stored, supabaseUserId, now = new Date()) {
  if (!stored || stored.version !== RECOVERY_CONTEXT_VERSION) {
    return { ok: false, reason: "malformed" }
  }
  if (recoveryContextContainsCredentials(stored)) {
    return { ok: false, reason: "credentials" }
  }
  const userId = trim(stored.userId)
  const expected = trim(supabaseUserId)
  if (!expected || userId !== expected) {
    return { ok: false, reason: "user_mismatch" }
  }
  const companyId = trim(stored.companyId)
  const membershipId = trim(stored.membershipId)
  const driverId = trim(stored.driverId)
  if (!companyId || !membershipId || !driverId) {
    return { ok: false, reason: "malformed_membership" }
  }
  if (!isUuidLike(membershipId) || membershipId === userId || membershipId === driverId || membershipId === companyId) {
    return { ok: false, reason: "malformed_membership" }
  }
  const verifiedAt = Date.parse(stored.verifiedAt)
  if (!Number.isFinite(verifiedAt)) {
    return { ok: false, reason: "malformed" }
  }
  const age = now.getTime() - verifiedAt
  if (age > RECOVERY_CONTEXT_MAX_AGE_MS || age < -5 * 60 * 1000) {
    return { ok: false, reason: "expired" }
  }
  return { ok: true }
}

async function evidenceForWalkaround(item, companyId, membershipId) {
  const refs = Array.isArray(item?.payload?.mediaRefs) ? item.payload.mediaRefs : []
  const odometerRef = item?.payload?.odometerPhotoMediaRef ?? refs[0] ?? null
  const signatureRef = item?.payload?.driverSignatureMediaRef ?? refs[1] ?? null
  const odometerPresent = odometerRef
    ? await hasWalkaroundMediaRecord(odometerRef, { companyId, membershipId }).catch(() => false)
    : false
  const signaturePresent = signatureRef
    ? await hasWalkaroundMediaRecord(signatureRef, { companyId, membershipId }).catch(() => false)
    : false
  let presentCount = 0
  for (const ref of refs) {
    if (await hasWalkaroundMediaRecord(ref, { companyId, membershipId }).catch(() => false)) presentCount += 1
  }
  return {
    clientCheckId: item?.payload?.clientCheckId ?? item?.idempotencyKey ?? item?.id,
    status: item?.status ?? ITEM_PENDING,
    odometerPresent,
    signaturePresent,
    mediaPresentCount: presentCount,
    mediaRefs: refs,
  }
}

export async function loadLocalPendingWork(companyId, membershipId) {
  const [walkaround, defects] = await Promise.all([
    listQueueItems(companyId, membershipId, QUEUE_WALKAROUND),
    listQueueItems(companyId, membershipId, QUEUE_OPS),
  ])
  const walkaroundDetails = []
  for (const item of walkaround) {
    walkaroundDetails.push(await evidenceForWalkaround(item, companyId, membershipId))
  }
  const pendingDefects = defects.filter((item) => item.status === ITEM_PENDING || item.type === "defect")
  const reconciliation = [...walkaround, ...defects].filter((item) => item.status === ITEM_RECONCILIATION)
  return {
    pendingChecks: walkaround.filter((item) => item.status === ITEM_PENDING).length,
    pendingDefects: pendingDefects.length,
    pendingReconciliation: reconciliation.length,
    walkarounds: walkaroundDetails,
  }
}

export async function buildOfflineRecoverySession(supabaseUserId, now = new Date()) {
  const stored = await durableGet(RECOVERY_CONTEXT_KEY)
  if (!stored.found) return { ok: false, reason: "missing" }
  const accepted = isRecoveryContextAcceptable(stored.value, supabaseUserId, now)
  if (!accepted.ok) return accepted
  const context = stored.value
  const pending = await loadLocalPendingWork(context.companyId, context.membershipId)
  return {
    ok: true,
    session: {
      userId: context.userId,
      driverId: context.driverId,
      organisationId: context.companyId,
      membershipId: context.membershipId,
      organisationName: context.organisationName,
      routeTarget: OFFLINE_RECOVERY_ROUTE,
      recoveryOnly: true,
      driver: {
        id: context.driverId,
        fullName: context.displayName,
        organisationName: context.organisationName,
      },
      recovery: {
        verifiedAt: context.verifiedAt,
        accountStatusLabel: context.accountStatusLabel,
        ...pending,
      },
    },
  }
}
