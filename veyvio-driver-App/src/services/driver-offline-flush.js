import { flushOpsOutbox } from "@/services/driver-ops-outbox.service"
import { flushPendingWalkaroundSubmissions } from "@/services/vehicle-check.service"

function unavailable(result) {
  return result?.status === "CONTEXT_UNAVAILABLE"
}

/**
 * Combined offline flush used by Home and Offline & sync.
 * RECONCILIATION_REQUIRED items stay excluded by each existing flusher.
 */
export async function flushDriverOfflineQueues(driver, session) {
  const [walkaround, ops] = await Promise.all([
    flushPendingWalkaroundSubmissions(driver, session),
    flushOpsOutbox(driver, session),
  ])

  if (unavailable(walkaround) || unavailable(ops)) {
    return {
      status: "CONTEXT_UNAVAILABLE",
      code: "OFFLINE_CONTEXT_NOT_READY",
      synced: 0,
      blocked: Number(ops?.blocked ?? 0),
      blockedItems: ops?.blockedItems ?? [],
      remaining: null,
      walkaroundSynced: Number(walkaround?.synced ?? 0),
      opsSynced: Number(ops?.synced ?? 0),
    }
  }

  return {
    status: "READY",
    code: null,
    synced: Number(walkaround?.synced ?? 0) + Number(ops?.synced ?? 0),
    blocked: Number(ops?.blocked ?? 0),
    blockedItems: ops?.blockedItems ?? [],
    remaining: Number(walkaround?.remaining ?? 0) + Number(ops?.remaining ?? 0),
    walkaroundSynced: Number(walkaround?.synced ?? 0),
    opsSynced: Number(ops?.synced ?? 0),
  }
}
