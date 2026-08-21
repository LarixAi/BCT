import { beforeEach, describe, expect, it, vi } from "vitest";

const reportDefectViaCommand = vi.fn();
const reportIncidentViaCommand = vi.fn();
const commandSignOnDuty = vi.fn();
const commandSignOffDuty = vi.fn();
const refreshSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }),
      refreshSession: (...args) => refreshSession(...args),
    },
  }),
}));

vi.mock("@/lib/command-api", () => ({
  getCommandApiBaseUrl: () => "https://command.example",
  commandStartDriverMessage: vi.fn(),
  commandSignOnDuty: (...args) => commandSignOnDuty(...args),
  commandSignOffDuty: (...args) => commandSignOffDuty(...args),
}));

vi.mock("@/services/command-driver-ops.service", () => ({
  reportDefectViaCommand: (...args) => reportDefectViaCommand(...args),
  reportIncidentViaCommand: (...args) => reportIncidentViaCommand(...args),
  replyDriverMessageViaCommand: vi.fn(),
}));

describe("driver-ops-outbox.service", () => {
  beforeEach(() => {
    vi.resetModules();
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
    vi.stubGlobal("navigator", { onLine: true });
    reportDefectViaCommand.mockReset();
    reportIncidentViaCommand.mockReset();
    commandSignOnDuty.mockReset();
    commandSignOffDuty.mockReset();
    refreshSession.mockReset();
  });

  it("keeps permanently rejected queue items in reconciliation state", async () => {
    const { enqueueOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueOpsCommand(
      "drv-1",
      { type: "defect", payload: { description: "Mirror crack", clientId: "ops-def-1" } },
      "co-1",
      "mem-1",
    );

    reportDefectViaCommand.mockResolvedValue({
      ok: false,
      status: 400,
      message: "No vehicle is assigned on a published duty. Ask dispatch before reporting.",
    });

    const result = await flushOpsOutbox({ id: "drv-1" }, { companyId: "co-1", membershipId: "mem-1" });

    expect(result.blocked).toBe(1);
    expect(result.remaining).toBe(1);
    const queue = await loadOpsOutbox("drv-1", "co-1", "mem-1");
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe("RECONCILIATION_REQUIRED");

    reportDefectViaCommand.mockClear();
    const second = await flushOpsOutbox({ id: "drv-1" }, { companyId: "co-1", membershipId: "mem-1" });
    expect(reportDefectViaCommand).not.toHaveBeenCalled();
    expect(second.blocked).toBe(0);
    expect(second.remaining).toBe(1);
  });

  it("keeps transient failures in the queue", async () => {
    const { enqueueOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueOpsCommand(
      "drv-2",
      { type: "incident", payload: { description: "Near miss", clientId: "ops-inc-1" } },
      "co-1",
      "mem-1",
    );

    reportIncidentViaCommand.mockResolvedValue({
      ok: false,
      status: 503,
      message: "Service unavailable",
    });

    const result = await flushOpsOutbox({ id: "drv-2" }, { companyId: "co-1", membershipId: "mem-1" });

    expect(result.synced).toBe(0);
    expect(result.blocked).toBe(0);
    expect(result.remaining).toBe(1);
    expect(await loadOpsOutbox("drv-2", "co-1", "mem-1")).toHaveLength(1);
  });

  it("queues duty sign-on offline and flushes when Command accepts", async () => {
    const { signOnDutyWithOutbox, flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");
    const { loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");

    vi.stubGlobal("navigator", { onLine: false });
    const queued = await signOnDutyWithOutbox({ id: "drv-3" }, { companyId: "co-1", membershipId: "mem-1" }, "duty-9");
    expect(queued.ok).toBe(true);
    expect(queued.queued).toBe(true);
    expect(await loadOpsOutbox("drv-3", "co-1", "mem-1")).toHaveLength(1);

    vi.stubGlobal("navigator", { onLine: true });
    commandSignOnDuty.mockResolvedValue({ ok: true, dutyId: "duty-9", signedOnAt: "2026-07-24T06:00:00.000Z" });

    const flushed = await flushOpsOutbox({ id: "drv-3" }, { companyId: "co-1", membershipId: "mem-1" });
    expect(flushed.synced).toBe(1);
    expect(flushed.remaining).toBe(0);
    expect(commandSignOnDuty).toHaveBeenCalledWith("tok", "duty-9");
  });

  it("keeps blocked duty sign-on replay for reconciliation instead of deleting it", async () => {
    const { enqueueDutyOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueDutyOpsCommand("drv-4", "duty_sign_on", "duty-10", "co-1", "mem-1");
    commandSignOnDuty.mockResolvedValue({
      ok: false,
      status: 403,
      code: "dispatch_blocked",
      message: "Complete today's vehicle check before signing on.",
      blocked: true,
    });

    const result = await flushOpsOutbox({ id: "drv-4" }, { companyId: "co-1", membershipId: "mem-1" });
    expect(result.blocked).toBe(1);
    expect(result.remaining).toBe(1);
    expect((await loadOpsOutbox("drv-4", "co-1", "mem-1"))[0].status).toBe("RECONCILIATION_REQUIRED");
  });

  it("retries a 401 after refreshing the session instead of dropping the report", async () => {
    const { enqueueDutyOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueDutyOpsCommand("drv-5", "duty_sign_on", "duty-11", "co-1", "mem-1");

    commandSignOnDuty
      .mockResolvedValueOnce({ ok: false, status: 401, message: "Not signed in." })
      .mockResolvedValueOnce({ ok: true, dutyId: "duty-11", signedOnAt: "2026-07-24T06:00:00.000Z" });
    refreshSession.mockResolvedValue({ data: { session: { access_token: "new-tok" } }, error: null });

    const result = await flushOpsOutbox({ id: "drv-5" }, { companyId: "co-1", membershipId: "mem-1" });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(commandSignOnDuty).toHaveBeenNthCalledWith(2, "new-tok", "duty-11");
    expect(result.synced).toBe(1);
    expect(result.blocked).toBe(0);
    expect(result.remaining).toBe(0);
    expect(await loadOpsOutbox("drv-5", "co-1", "mem-1")).toEqual([]);
  });

  it("keeps the report queued (never drops it) when a 401 cannot be refreshed", async () => {
    const { enqueueDutyOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueDutyOpsCommand("drv-6", "duty_sign_on", "duty-12", "co-1", "mem-1");

    commandSignOnDuty.mockResolvedValue({ ok: false, status: 401, message: "Not signed in." });
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: "refresh token expired" } });

    const result = await flushOpsOutbox({ id: "drv-6" }, { companyId: "co-1", membershipId: "mem-1" });

    expect(result.synced).toBe(0);
    expect(result.blocked).toBe(0);
    expect(result.remaining).toBe(1);
    expect(await loadOpsOutbox("drv-6", "co-1", "mem-1")).toHaveLength(1);
  });

  it("does not acknowledge queued-success when durable persist fails", async () => {
    const { DurableStorageError } = await import("@/lib/driver-durable-kv");
    vi.doMock("@/lib/driver-durable-kv", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        durablePut: vi.fn(async () => {
          throw new DurableStorageError("OFFLINE_STORAGE_WRITE_FAILED", "Could not save this action on the device.");
        }),
      };
    });
    const { signOnDutyWithOutbox } = await import("@/services/driver-ops-outbox.service");
    vi.stubGlobal("navigator", { onLine: false });
    const queued = await signOnDutyWithOutbox({ id: "drv-7" }, { companyId: "co-1", membershipId: "mem-1" }, "duty-13");
    expect(queued.ok).toBe(false);
    expect(queued.queued).toBe(false);
    vi.doUnmock("@/lib/driver-durable-kv");
  });
});
