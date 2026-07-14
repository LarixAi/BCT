import { create } from "zustand";
import type { OutboxMutation, OutboxMutationType, SyncState, SyncStatus } from "@/types/sync";
import { getDeviceId } from "@/platform/device/device-id";
import { listOutboxMutations, saveOutboxMutation, updateOutboxMutation } from "@/platform/storage/local-db";
import { isOnline } from "@/platform/device/connectivity";

function uid() {
  return `op_${crypto.randomUUID()}`;
}

function recomputeCounts(mutations: OutboxMutation[]): Pick<SyncState, "pendingCount" | "failedCount"> {
  let pendingCount = 0;
  let failedCount = 0;
  for (const m of mutations) {
    if (m.status === "pending" || m.status === "syncing") pendingCount++;
    if (m.status === "failed" || m.status === "conflict") failedCount++;
  }
  return { pendingCount, failedCount };
}

interface OutboxStore extends SyncState {
  hydrate: () => Promise<void>;
  enqueue: (input: {
    type: OutboxMutationType;
    companyId: string;
    depotId: string;
    userId: string;
    payload: unknown;
    idempotencyKey?: string;
    commandId?: string;
    aggregateId?: string;
    expectedVersion?: number;
    correlationId?: string;
  }) => Promise<OutboxMutation>;
  markSynced: (localOperationId: string, serverId?: string) => Promise<void>;
  markFailed: (localOperationId: string, error: string) => Promise<void>;
  markSyncing: (localOperationId: string) => Promise<void>;
  retryMutation: (localOperationId: string) => Promise<void>;
  setStatus: (status: SyncStatus, lastSyncedAt?: string | null) => void;
}

export const useSyncStore = create<OutboxStore>((set) => ({
  status: "idle",
  lastSyncedAt: null,
  pendingCount: 0,
  failedCount: 0,

  hydrate: async () => {
    const mutations = await listOutboxMutations();
    const counts = recomputeCounts(mutations);
    set({
      ...counts,
      status: !isOnline()
        ? "offline"
        : counts.failedCount > 0
          ? "failed"
          : counts.pendingCount > 0
            ? "syncing"
            : "synced",
    });
  },

  enqueue: async ({
    type,
    companyId,
    depotId,
    userId,
    payload,
    idempotencyKey,
    commandId,
    aggregateId,
    expectedVersion,
    correlationId,
  }) => {
    const mutation: OutboxMutation = {
      localOperationId: uid(),
      type,
      companyId,
      depotId,
      userId,
      deviceId: getDeviceId(),
      createdAt: new Date().toISOString(),
      payload,
      status: "pending",
      idempotencyKey,
      commandId,
      aggregateId,
      expectedVersion,
      correlationId,
    };
    await saveOutboxMutation(mutation);
    const mutations = await listOutboxMutations();
    const counts = recomputeCounts(mutations);
    set({ ...counts, status: isOnline() ? "syncing" : "offline" });
    return mutation;
  },

  markSynced: async (localOperationId, serverId) => {
    const mutations = await listOutboxMutations();
    const m = mutations.find((x) => x.localOperationId === localOperationId);
    if (!m) return;
    await updateOutboxMutation({ ...m, status: "synced", serverId });
    const next = await listOutboxMutations();
    const counts = recomputeCounts(next);
    set({
      ...counts,
      status: counts.pendingCount > 0 ? "syncing" : "synced",
      lastSyncedAt: new Date().toISOString(),
    });
  },

  markFailed: async (localOperationId, error) => {
    const mutations = await listOutboxMutations();
    const m = mutations.find((x) => x.localOperationId === localOperationId);
    if (!m) return;
    await updateOutboxMutation({ ...m, status: "failed", error });
    const next = await listOutboxMutations();
    set({ ...recomputeCounts(next), status: "failed" });
  },

  markSyncing: async (localOperationId) => {
    const mutations = await listOutboxMutations();
    const m = mutations.find((x) => x.localOperationId === localOperationId);
    if (!m || m.status !== "pending") return;
    await updateOutboxMutation({ ...m, status: "syncing" });
    const next = await listOutboxMutations();
    set(recomputeCounts(next));
  },

  retryMutation: async (localOperationId) => {
    const mutations = await listOutboxMutations();
    const m = mutations.find((x) => x.localOperationId === localOperationId);
    if (!m || (m.status !== "failed" && m.status !== "conflict")) return;
    await updateOutboxMutation({ ...m, status: "pending", error: undefined });
    const next = await listOutboxMutations();
    const counts = recomputeCounts(next);
    set({
      ...counts,
      status: isOnline() ? (counts.failedCount > 0 ? "failed" : "syncing") : "offline",
    });
  },

  setStatus: (status, lastSyncedAt) => {
    set((s) => ({
      status,
      lastSyncedAt: lastSyncedAt !== undefined ? lastSyncedAt : s.lastSyncedAt,
    }));
  },
}));
