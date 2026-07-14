import {
  saveBootstrapCache,
  listOutboxMutations,
  countUnsyncedOutboxMutations,
  clearBootstrapCache,
  clearSyncedOutboxMutations,
  clearAllActiveTripSnapshots,
  updateOutboxMutation,
} from "@/platform/storage/local-db";
import { isOnline } from "@/platform/device/connectivity";
import { applyBootstrapToDriver } from "@/platform/driver/hydrate-driver-store";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { notifySyncFailed } from "@/platform/sync/sync-notify";
import { useSyncStore } from "./outbox";
import { getCommandTransport } from "@/platform/api/command-transport";
import { outboxMutationToCommand, mockSyncMutation } from "@/platform/api/command-transport.mock";
import { useDriverStore } from "@/store/driver";
import type { DutyDetail } from "@/types/duty";

export interface BootstrapSyncResult {
  ok: boolean;
  error?: string;
}

export async function runBootstrapSync(
  companyId: string,
  depotId: string,
  driverId: string,
): Promise<BootstrapSyncResult> {
  const sync = useSyncStore.getState();
  sync.setStatus("syncing");

  if (!isOnline()) {
    sync.setStatus("offline");
    return { ok: false, error: "No network connection" };
  }

  try {
    await new Promise((r) => setTimeout(r, 600));
    const payload = buildBootstrapPayload(companyId, depotId, driverId);
    await saveBootstrapCache(payload);
    applyBootstrapToDriver(payload);
    sync.setStatus("synced", payload.syncedAt);
    return { ok: true };
  } catch (e) {
    sync.setStatus("failed");
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" };
  }
}

export async function processOutbox(): Promise<{ processed: number; failed: number }> {
  const sync = useSyncStore.getState();
  if (!isOnline()) {
    sync.setStatus("offline");
    return { processed: 0, failed: 0 };
  }

  const mutations = await listOutboxMutations();
  const pending = mutations.filter((m) => m.status === "pending");

  if (pending.length === 0) {
    await sync.hydrate();
    const { failedCount } = useSyncStore.getState();
    sync.setStatus(failedCount > 0 ? "failed" : "synced");
    return { processed: 0, failed: 0 };
  }

  sync.setStatus("syncing");
  let processed = 0;
  let failed = 0;
  const transport = getCommandTransport();

  for (const mutation of pending) {
    try {
      await sync.markSyncing(mutation.localOperationId);
      const command = outboxMutationToCommand(mutation);

      if (!command) {
        // Legacy envelope-less mutations (e.g. duty.start)
        const serverId = await mockSyncMutation(mutation);
        await sync.markSynced(mutation.localOperationId, serverId);
        processed++;
        continue;
      }

      const result = await transport.send(command);

      if (result.status === "accepted") {
        await sync.markSynced(mutation.localOperationId, `srv_${result.commandId}`);
        processed++;
        continue;
      }

      // Structured rejection — not regex on Error.message
      if (result.reasonCode === "VERSION_CONFLICT") {
        const latest = await listOutboxMutations();
        const m = latest.find((x) => x.localOperationId === mutation.localOperationId);
        if (m) {
          await updateOutboxMutation({
            ...m,
            status: "conflict",
            error: result.reasonCode,
          });
        }
        if (result.serverProjection) {
          useDriverStore.getState().projectDuty(result.serverProjection as DutyDetail);
        }
        sync.setStatus("conflict");
        notifySyncFailed("Assignment or duty changed — review Operations update.");
        failed++;
        continue;
      }

      await sync.markFailed(mutation.localOperationId, result.reasonCode);
      notifySyncFailed(result.reasonCode);
      failed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      await sync.markFailed(mutation.localOperationId, message);
      notifySyncFailed(message);
      failed++;
    }
  }

  return { processed, failed };
}

export async function clearDownloadedOperationalData(
  depotId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const unsynced = await countUnsyncedOutboxMutations();
  if (unsynced > 0) {
    return {
      ok: false,
      reason: "Sync or retry pending changes before clearing downloaded data.",
    };
  }

  await clearBootstrapCache(depotId);
  await clearSyncedOutboxMutations();
  await clearAllActiveTripSnapshots();
  useSyncStore.getState().setStatus("idle", null);
  await useSyncStore.getState().hydrate();
  return { ok: true };
}
