import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OutboxMutation } from "@/types/sync";

const mutations: OutboxMutation[] = [];

vi.mock("@/platform/storage/local-db", () => ({
  listOutboxMutations: vi.fn(async () => [...mutations]),
  listOutboxMutationsForCompany: vi.fn(async (companyId: string) => mutations.filter(m => m.companyId === companyId)),
  updateOutboxMutation: vi.fn(async (m: OutboxMutation) => {
    const i = mutations.findIndex(x => x.localOperationId === m.localOperationId);
    if (i >= 0) mutations[i] = m;
  }),
  saveBootstrapCache: vi.fn(),
}));

vi.mock("@/platform/api", () => ({
  getYardApi: () => ({ pushMutation: vi.fn(async () => ({ serverId: "srv_1" })) }),
  isMockApi: () => false,
  usesCommandYardApi: () => false,
}));

vi.mock("@/platform/device/connectivity", () => ({
  isOnline: () => true,
}));

vi.mock("@/platform/tenancy/context-store", () => ({
  getTenancySnapshot: () => ({ companyId: "co", depotId: "dep" }),
}));

vi.mock("@/platform/sync/sync-notify", () => ({
  notifySyncComplete: vi.fn(),
  notifySyncFailed: vi.fn(),
}));

import { processOutbox, releaseStuckSyncingMutations } from "@/platform/sync/sync-engine";
import { useSyncStore } from "@/platform/sync/outbox";

describe("releaseStuckSyncingMutations", () => {
  beforeEach(() => {
    mutations.length = 0;
    useSyncStore.setState({ pendingCount: 0, failedCount: 0, status: "idle" });
  });

  it("resets syncing rows to pending so processOutbox can upload them", async () => {
    mutations.push({
      localOperationId: "op_stuck",
      type: "equipment.assign",
      companyId: "co",
      depotId: "dep",
      userId: "u",
      deviceId: "d",
      createdAt: new Date().toISOString(),
      payload: {},
      status: "syncing",
    });

    const released = await releaseStuckSyncingMutations();
    expect(released).toBe(1);
    expect(mutations[0].status).toBe("pending");

    const result = await processOutbox();
    expect(result.processed).toBe(1);
    expect(mutations[0].status).toBe("synced");
  });

  it("never pushes a mutation queued for a different company than the active tenant", async () => {
    mutations.push({
      localOperationId: "op_other_company",
      type: "equipment.assign",
      companyId: "some-other-company",
      depotId: "dep",
      userId: "u",
      deviceId: "d",
      createdAt: new Date().toISOString(),
      payload: {},
      status: "pending",
    });

    const result = await processOutbox();
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(mutations[0].status).toBe("pending");
  });
});
