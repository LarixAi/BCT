import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { isOnline } from "@/platform/device/connectivity";
import { useSyncStore } from "@/platform/sync/outbox";
import { processOutbox } from "@/platform/sync/sync-engine";
import { notifyAfterEnqueue } from "@/platform/sync/sync-notify";
import { isMockApi } from "@/platform/api/config";
import type { OutboxMutationType } from "@/types/sync";
import { aggregateIdFromPayload, buildCommandEnvelope } from "@/domain/ops/offline-commands";
import { getMockDutyDetail, mutateMockDuty } from "@/data/mocks/duties";
import { listOutboxMutations } from "@/platform/storage/local-db";
import { useDriverStore } from "@/store/driver";

function applyMutationLocally(
  type: OutboxMutationType,
  payload: unknown,
  idempotencyKey?: string,
): void {
  mutateMockDuty({
    localOperationId: `local_${type}_${Date.now()}`,
    type,
    companyId: "local",
    depotId: "local",
    userId: "local",
    createdAt: new Date().toISOString(),
    payload,
    status: "synced",
    idempotencyKey,
  });
  const dutyId = (payload as { dutyId?: string } | null)?.dutyId;
  if (!dutyId) return;
  const updated = getMockDutyDetail(dutyId);
  if (updated) useDriverStore.getState().projectDuty(updated);
}

/**
 * Enqueue a driver mutation into the outbox and process when online.
 * Mock API always applies locally so open-journey / prep never hang on outbox rejects.
 * Missing session/tenancy also applies locally.
 */
export async function enqueueDriverMutation(
  type: OutboxMutationType,
  payload: unknown,
  idempotencyKey?: string,
): Promise<void> {
  const tenancy = getTenancySnapshot();
  const session = getSessionSnapshot();
  const canEnqueue = Boolean(tenancy.companyId && tenancy.depotId && session.user?.id);

  // Local mock / partial boot — apply immediately and surface operational rejects
  if (isMockApi() || !canEnqueue) {
    applyMutationLocally(type, payload, idempotencyKey);
    return;
  }

  const aggregateId = aggregateIdFromPayload(type, payload);
  const envelope = buildCommandEnvelope({
    type,
    aggregateId,
    payload,
    correlationId: idempotencyKey,
  });
  const key = idempotencyKey ?? envelope?.commandId;

  const mutation = await useSyncStore.getState().enqueue({
    type,
    companyId: tenancy.companyId!,
    depotId: tenancy.depotId!,
    userId: session.user!.id,
    payload,
    idempotencyKey: key,
    commandId: envelope?.commandId,
    aggregateId: envelope?.aggregateId,
    expectedVersion: envelope?.expectedVersion,
    correlationId: envelope?.correlationId,
  });

  notifyAfterEnqueue();

  if (isOnline()) await processOutbox();

  const latest = await listOutboxMutations();
  const ours =
    latest.find((m) => m.localOperationId === mutation.localOperationId) ??
    latest.find((m) => key && m.idempotencyKey === key);

  if (ours?.status === "failed" || ours?.status === "conflict") {
    throw new Error(ours.error ?? "Could not sync this update. Try again.");
  }
  if (ours && (ours.status === "pending" || ours.status === "syncing")) {
    // Still waiting — keep optimistic UX; screens that need certainty should re-check state
    return;
  }
}
