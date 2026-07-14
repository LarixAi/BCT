import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { isOnline } from "@/platform/device/connectivity";
import { useSyncStore } from "@/platform/sync/outbox";
import { processOutbox } from "@/platform/sync/sync-engine";
import { notifyAfterEnqueue } from "@/platform/sync/sync-notify";
import type { OutboxMutationType } from "@/types/sync";

export async function enqueueYardMutation(type: OutboxMutationType, payload: unknown): Promise<void> {
  const tenancy = getTenancySnapshot();
  const session = getSessionSnapshot();
  if (!tenancy.companyId || !tenancy.depotId || !session.user?.id) return;

  await useSyncStore.getState().enqueue({
    type,
    companyId: tenancy.companyId,
    depotId: tenancy.depotId,
    userId: session.user.id,
    payload,
  });

  notifyAfterEnqueue();

  if (isOnline()) {
    void processOutbox();
  }
}
