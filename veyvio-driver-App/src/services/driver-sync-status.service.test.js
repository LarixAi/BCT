import { describe, expect, it, vi } from "vitest";
import {
  countPendingOfflineCommands,
  describeOfflineQueue,
} from "@/services/driver-sync-status.service";

vi.mock("@/lib/walkaround-sync.storage", () => ({
  loadSyncQueue: vi.fn(async () => [{ id: "w1" }, { id: "w2" }]),
}));

vi.mock("@/lib/fleet-tracking-queue.storage", () => ({
  loadFleetPingQueue: vi.fn(async () => [{ id: "p1" }]),
}));

vi.mock("@/lib/driver-ops-outbox.storage", () => ({
  loadOpsOutbox: vi.fn(async () => [{ id: "d1", type: "defect" }]),
}));

describe("driver-sync-status.service", () => {
  it("sums walkaround and location pending commands", async () => {
    expect(await countPendingOfflineCommands("drv-1", "co-a", "mem-1")).toBe(4);
    expect(await describeOfflineQueue("drv-1", "co-a", "mem-1")).toEqual({
      total: 4,
      walkaroundChecks: 2,
      locationPings: 1,
      opsCommands: 1,
      defects: 1,
      incidents: 0,
      messages: 0,
      dutyOps: 0,
      journeySteps: 0,
      handbacks: 0,
      dutyCloseouts: 0,
      vehicleSwapRequests: 0,
      jobExecution: 0,
    });
  });
});
