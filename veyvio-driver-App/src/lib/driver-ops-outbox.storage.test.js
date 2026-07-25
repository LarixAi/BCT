import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueDutyOpsCommand,
  enqueueOpsCommand,
  loadOpsOutbox,
  opsOutboxKey,
} from "@/lib/driver-ops-outbox.storage";

describe("driver-ops-outbox.storage", () => {
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

  it("uses tenant-scoped keys when company and membership are present", () => {
    expect(opsOutboxKey("drv-1", "co-a", "mem-1")).toBe("driver:co-a:mem-1:ops-command-outbox");
  });

  it("isolates ops queues per tenant workspace", () => {
    enqueueOpsCommand(
      "drv-1",
      { type: "defect", payload: { description: "Mirror" } },
      "co-a",
      "mem-1",
    );
    enqueueOpsCommand(
      "drv-1",
      { type: "incident", payload: { description: "Near miss" } },
      "co-b",
      "mem-2",
    );

    expect(loadOpsOutbox("drv-1", "co-a", "mem-1")).toHaveLength(1);
    expect(loadOpsOutbox("drv-1", "co-b", "mem-2")).toHaveLength(1);
    expect(loadOpsOutbox("drv-1", "co-a", "mem-1")[0].type).toBe("defect");
    expect(loadOpsOutbox("drv-1", "co-b", "mem-2")[0].type).toBe("incident");
  });

  it("dedupes pending duty sign-on commands per duty id", () => {
    enqueueDutyOpsCommand("drv-1", "duty_sign_on", "duty-9", "co-a", "mem-1");
    enqueueDutyOpsCommand("drv-1", "duty_sign_on", "duty-9", "co-a", "mem-1");

    expect(loadOpsOutbox("drv-1", "co-a", "mem-1")).toHaveLength(1);
    expect(loadOpsOutbox("drv-1", "co-a", "mem-1")[0].payload.dutyId).toBe("duty-9");
  });
});
