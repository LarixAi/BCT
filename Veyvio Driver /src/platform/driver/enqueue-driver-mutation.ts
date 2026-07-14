import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { isOnline } from "@/platform/device/connectivity";
import { useSyncStore } from "@/platform/sync/outbox";
import { processOutbox } from "@/platform/sync/sync-engine";
import { notifyAfterEnqueue } from "@/platform/sync/sync-notify";
import type { OutboxMutationType } from "@/types/sync";
import { aggregateIdFromPayload, buildCommandEnvelope } from "@/domain/ops/offline-commands";

export async function enqueueDriverMutation(
  type: OutboxMutationType,
  payload: unknown,
  idempotencyKey?: string,
): Promise<void> {
  const tenancy = getTenancySnapshot();
  const session = getSessionSnapshot();
  if (!tenancy.companyId || !tenancy.depotId || !session.user?.id) return;

  const aggregateId = aggregateIdFromPayload(type, payload);
  const envelope = buildCommandEnvelope({
    type,
    aggregateId,
    payload,
    correlationId: idempotencyKey,
  });

  await useSyncStore.getState().enqueue({
    type,
    companyId: tenancy.companyId,
    depotId: tenancy.depotId,
    userId: session.user.id,
    payload,
    idempotencyKey: idempotencyKey ?? envelope?.commandId,
    commandId: envelope?.commandId,
    aggregateId: envelope?.aggregateId,
    expectedVersion: envelope?.expectedVersion,
    correlationId: envelope?.correlationId,
  });

  notifyAfterEnqueue();

  if (isOnline()) await processOutbox();
}
