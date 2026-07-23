import { getYardApi, isMockApi, usesCommandYardApi } from "@/platform/api";
import type { YardRole } from "@/types/permissions";
import { saveBootstrapCache, listOutboxMutations } from "@/platform/storage/local-db";
import { isOnline } from "@/platform/device/connectivity";
import { applyBootstrapToYard, hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { notifySyncComplete, notifySyncFailed } from "@/platform/sync/sync-notify";
import { conflictMessage } from "@/domain/sync/conflict-policy";
import { useSyncStore } from "./outbox";

export interface BootstrapSyncResult {
  ok: boolean;
  error?: string;
}

export async function runBootstrapSync(
  companyId: string,
  depotId: string,
  role: YardRole = "yard_manager",
): Promise<BootstrapSyncResult> {
  const sync = useSyncStore.getState();
  sync.setStatus("syncing");

  if (!isMockApi() && !isOnline()) {
    sync.setStatus("offline");
    return { ok: false, error: "No network connection" };
  }

  try {
    const payload = await getYardApi().fetchBootstrap(companyId, depotId, role);
    try {
      await saveBootstrapCache(payload);
    } catch {
      /* IndexedDB may be unavailable — hydrate still applies */
    }
    applyBootstrapToYard(payload);
    sync.setStatus("synced", payload.syncedAt);
    return { ok: true };
  } catch (e) {
    sync.setStatus("failed");
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" };
  }
}

/** Upload pending outbox mutations to API when online. */
export async function processOutbox(): Promise<{ processed: number; failed: number }> {
  const sync = useSyncStore.getState();
  if (!isMockApi() && !isOnline()) {
    sync.setStatus("offline");
    return { processed: 0, failed: 0 };
  }

  const mutations = await listOutboxMutations();
  const pending = mutations.filter(m => m.status === "pending");

  if (pending.length === 0) {
    await sync.hydrate();
    const { failedCount } = useSyncStore.getState();
    sync.setStatus(failedCount > 0 ? "failed" : "synced");
    return { processed: 0, failed: 0 };
  }

  sync.setStatus("syncing");
  const api = getYardApi();
  let processed = 0;
  let failed = 0;

  for (const m of pending) {
    try {
      await sync.markSyncing(m.localOperationId);
      const result = await api.pushMutation(m);
      await sync.markSynced(m.localOperationId, result.serverId);
      processed++;
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Upload failed";
      const conflict = raw.toLowerCase().includes("conflict") || raw.includes("409");
      const message = conflict ? conflictMessage(m.type) : raw;
      if (conflict) {
        await sync.markConflict(m.localOperationId, message);
      } else {
        await sync.markFailed(m.localOperationId, message);
      }
      failed++;
    }
  }

  await sync.hydrate();

  if (failed > 0) {
    notifySyncFailed();
  } else if (processed > 0) {
    notifySyncComplete(processed);
    if (usesCommandYardApi()) {
      const tenancy = getTenancySnapshot();
      if (tenancy.companyId && tenancy.depotId) {
        void hydrateYardFromApi({
          companyId: tenancy.companyId,
          depotId: tenancy.depotId,
          role: (tenancy.role as YardRole) ?? "yard_manager",
        });
      }
    }
  }

  return { processed, failed };
}
