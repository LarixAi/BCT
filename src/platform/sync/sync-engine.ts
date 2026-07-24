import { getYardApi, isMockApi, usesCommandYardApi } from "@/platform/api";
import { commandApiUrl, getSupabaseAnonKey } from "@/platform/auth/auth-config";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import type { YardRole } from "@/types/permissions";
import { saveBootstrapCache, listOutboxMutations, updateOutboxMutation } from "@/platform/storage/local-db";
import { isOnline } from "@/platform/device/connectivity";
import { applyBootstrapToYard, hydrateYardFromApi } from "@/platform/yard/hydrate-yard-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { notifySyncComplete, notifySyncFailed } from "@/platform/sync/sync-notify";
import { conflictMessage } from "@/domain/sync/conflict-policy";
import { formatSyncError } from "@/domain/sync/format-sync-error";
import { isUntrustedServerId } from "@/domain/sync/is-trusted-server-id";
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

  await releaseStuckSyncingMutations();

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
      if (usesCommandYardApi() && isUntrustedServerId(result.serverId)) {
        throw new Error("Command did not persist this yard action — handler may not be deployed yet");
      }
      await sync.markSynced(m.localOperationId, result.serverId);
      processed++;
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Upload failed";
      const conflict = raw.toLowerCase().includes("conflict") || raw.includes("409");
      const message = conflict ? conflictMessage(m.type) : formatSyncError(raw);
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

/** Move failed/conflict queue items back to pending so they can be retried after a backend deploy. */
export async function requeueFailedOutbox(): Promise<number> {
  const mutations = await listOutboxMutations();
  let requeued = 0;
  for (const m of mutations) {
    if (m.status !== "failed" && m.status !== "conflict") continue;
    await updateOutboxMutation({ ...m, status: "pending", error: undefined });
    requeued++;
  }
  await useSyncStore.getState().hydrate();
  return requeued;
}

/** Items left in `syncing` after a tab refresh or interrupted upload block the queue forever unless reset. */
export async function releaseStuckSyncingMutations(): Promise<number> {
  const mutations = await listOutboxMutations();
  let released = 0;
  for (const m of mutations) {
    if (m.status !== "syncing") continue;
    await updateOutboxMutation({ ...m, status: "pending" });
    released++;
  }
  if (released > 0) {
    await useSyncStore.getState().hydrate();
  }
  return released;
}

/** True when POST /yard/mutations exists on Command (401/400 ok — 404 means not deployed). */
export async function probeYardSyncRoute(): Promise<boolean> {
  if (isMockApi()) return true;
  try {
    const anon = getSupabaseAnonKey();
    const token = getSessionSnapshot().accessToken;
    const res = await fetch(commandApiUrl("/yard/mutations"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(anon ? { apikey: anon } : {}),
        Authorization: `Bearer ${token && !token.startsWith("mock_") ? token : anon ?? ""}`,
      },
      body: JSON.stringify({ type: "task.update", payload: { taskId: "probe" } }),
    });
    return res.status !== 404;
  } catch {
    return false;
  }
}

export async function clearFailedOutbox(): Promise<number> {
  const { clearFailedOutboxMutations } = await import("@/platform/storage/local-db");
  const removed = await clearFailedOutboxMutations();
  await useSyncStore.getState().hydrate();
  return removed;
}
