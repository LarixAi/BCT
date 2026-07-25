import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueFleetPing,
  fleetPingQueueKey,
  loadFleetPingQueue,
} from "@/lib/fleet-tracking-queue.storage";

describe("fleet-tracking-queue.storage", () => {
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

  it("scopes queue keys by company and membership", () => {
    const key = fleetPingQueueKey("drv-1", "co-a", "mem-1");
    expect(key).toBe("driver:co-a:mem-1:fleet-ping-queue");
  });

  it("isolates queues per tenant workspace", () => {
    enqueueFleetPing("drv-1", { latitude: 51.5 }, "co-a", "mem-1");
    enqueueFleetPing("drv-1", { latitude: 52.0 }, "co-b", "mem-2");

    expect(loadFleetPingQueue("drv-1", "co-a", "mem-1")).toHaveLength(1);
    expect(loadFleetPingQueue("drv-1", "co-b", "mem-2")).toHaveLength(1);
    expect(loadFleetPingQueue("drv-1", "co-a", "mem-1")[0].payload.latitude).toBe(51.5);
  });

  it("migrates legacy driver-only queue into scoped workspace", () => {
    const legacyKey = "csf_fleet_tracking_ping_queue:drv-1";
    localStorage.setItem(
      legacyKey,
      JSON.stringify([{ id: "legacy-1", payload: { latitude: 50.1 } }]),
    );

    const queue = loadFleetPingQueue("drv-1", "co-a", "mem-1");
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.latitude).toBe(50.1);
    expect(localStorage.getItem(legacyKey)).toBeNull();
  });
});
