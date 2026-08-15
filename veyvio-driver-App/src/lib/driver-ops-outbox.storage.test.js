import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineContextError } from "@/lib/driver-workspace-storage";
import { DurableStorageError, durablePut } from "@/lib/driver-durable-kv";
import {
  OPS_ITEM_RECONCILIATION,
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

  it("uses tenant-scoped keys from production builder when company and membership are present", () => {
    expect(opsOutboxKey("drv-1", "co-a", "mem-1")).toBe("driver:co-a:mem-1:ops-command-outbox");
  });

  it("fails closed when tenant context is missing", () => {
    expect(() => opsOutboxKey("drv-1", null, "mem-1")).toThrow(OfflineContextError);
    expect(() => opsOutboxKey("drv-1", "co-a", "")).toThrow(OfflineContextError);
  });

  it("isolates ops queues per tenant workspace", async () => {
    await enqueueOpsCommand(
      "drv-1",
      { type: "defect", payload: { description: "Mirror" } },
      "co-a",
      "mem-1",
    );
    await enqueueOpsCommand(
      "drv-1",
      { type: "incident", payload: { description: "Near miss" } },
      "co-b",
      "mem-2",
    );

    expect(await loadOpsOutbox("drv-1", "co-a", "mem-1")).toHaveLength(1);
    expect(await loadOpsOutbox("drv-1", "co-b", "mem-2")).toHaveLength(1);
    expect((await loadOpsOutbox("drv-1", "co-a", "mem-1"))[0].type).toBe("defect");
    expect((await loadOpsOutbox("drv-1", "co-b", "mem-2"))[0].type).toBe("incident");
  });

  it("preserves queued work after a simulated app restart (reload from durable store)", async () => {
    await enqueueOpsCommand(
      "drv-1",
      { type: "defect", payload: { description: "Brake warning", clientId: "ops-keep-1" } },
      "co-a",
      "mem-1",
    );
    const afterRestart = await loadOpsOutbox("drv-1", "co-a", "mem-1");
    expect(afterRestart).toHaveLength(1);
    expect(afterRestart[0].idempotencyKey).toBe("ops-keep-1");
    expect(afterRestart[0].payload.clientId).toBe("ops-keep-1");
  });

  it("migrates legacy localStorage queues into durable storage then removes the legacy copy", async () => {
    const key = opsOutboxKey("drv-1", "co-a", "mem-1");
    localStorage.setItem(
      key,
      JSON.stringify([{ id: "legacy-scoped", type: "defect", payload: { clientId: "legacy-scoped" } }]),
    );
    localStorage.setItem(
      "csf_driver_ops_outbox:drv-1",
      JSON.stringify([{ id: "legacy-driver", type: "incident", payload: { clientId: "legacy-driver" } }]),
    );

    const queue = await loadOpsOutbox("drv-1", "co-a", "mem-1");
    expect(queue.map((item) => item.id).sort()).toEqual(["legacy-driver", "legacy-scoped"]);
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem("csf_driver_ops_outbox:drv-1")).toBeNull();
    expect(await loadOpsOutbox("drv-1", "co-a", "mem-1")).toHaveLength(2);
  });

  it("does not treat unreadable durable storage as an empty queue", async () => {
    await durablePut(opsOutboxKey("drv-1", "co-a", "mem-1"), { items: "not-an-array" });
    await expect(loadOpsOutbox("drv-1", "co-a", "mem-1")).rejects.toBeInstanceOf(DurableStorageError);
  });

  it("dedupes pending duty sign-on commands per duty id", async () => {
    await enqueueDutyOpsCommand("drv-1", "duty_sign_on", "duty-9", "co-a", "mem-1");
    await enqueueDutyOpsCommand("drv-1", "duty_sign_on", "duty-9", "co-a", "mem-1");

    const queue = await loadOpsOutbox("drv-1", "co-a", "mem-1");
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.dutyId).toBe("duty-9");
    expect(queue[0].status).not.toBe(OPS_ITEM_RECONCILIATION);
  });
});
