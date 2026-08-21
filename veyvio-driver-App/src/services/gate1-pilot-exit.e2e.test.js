import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPhvModuleEnabled } from "@/lib/phv-module-enabled";
import { describeOfflineQueue } from "@/services/driver-sync-status.service";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";
import { canSignOnForDuty } from "@/lib/driver-sign-on-gate";

describe("gate1 pilot exit automated checks", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = value;
      },
      removeItem(key) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("keeps production modules gated off by default", () => {
    expect(isPhvModuleEnabled()).toBe(false);
    expect(process.env.VITE_ENABLE_BASE44).not.toBe("true");
    expect(process.env.VITE_MOCK_API).not.toBe("true");
  });

  it("aggregates offline queue counts for sync centre honesty", async () => {
    await enqueueOpsCommand("drv-pilot", { type: "defect", payload: {} }, "co-bct", "mem-1");
    const summary = await describeOfflineQueue("drv-pilot", "co-bct", "mem-1");
    expect(summary.opsCommands).toBeGreaterThan(0);
  });

  it("assigns stable client ids to queued defect reports", async () => {
    const { enqueueOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    await enqueueOpsCommand(
      "drv-pilot",
      { type: "defect", payload: { description: "Wiper fault" } },
      "co-bct",
      "mem-1",
    );
    const queue = await loadOpsOutbox("drv-pilot", "co-bct", "mem-1");
    expect(queue[0].payload.clientId).toBe(queue[0].id);
  });

  it("queues duty sign-on offline for sync centre counts", async () => {
    const { enqueueDutyOpsCommand } = await import("@/lib/driver-ops-outbox.storage");
    const { describeOfflineQueue } = await import("@/services/driver-sync-status.service");
    await enqueueDutyOpsCommand("drv-pilot", "duty_sign_on", "duty-1", "co-bct", "mem-1");
    const summary = await describeOfflineQueue("drv-pilot", "co-bct", "mem-1");
    expect(summary.dutyOps).toBe(1);
    expect(summary.opsCommands).toBeGreaterThan(0);
  });

  it("blocks sign-on when server eligibility fails closed", () => {
    expect(
      canSignOnForDuty({
        bootstrap: { eligibility: { allowed: false, blockers: ["Licence expired"] } },
        duty: { vehicleCheck: { canStartDuty: true } },
      }),
    ).toBe(false);
  });
});
