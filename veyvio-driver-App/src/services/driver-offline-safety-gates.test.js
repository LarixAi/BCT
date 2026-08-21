import { beforeEach, describe, expect, it, vi } from "vitest";

const reportDefectViaCommand = vi.fn();
const commandSignOnDuty = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null }),
    },
  }),
}));

vi.mock("@/lib/command-api", () => ({
  getCommandApiBaseUrl: () => "https://command.example",
  commandSignOnDuty: (...args) => commandSignOnDuty(...args),
  commandSignOffDuty: vi.fn(),
  commandStartDriverMessage: vi.fn(),
}));

vi.mock("@/services/command-driver-ops.service", () => ({
  reportDefectViaCommand: (...args) => reportDefectViaCommand(...args),
  reportIncidentViaCommand: vi.fn(),
  replyDriverMessageViaCommand: vi.fn(),
}));

describe("FIX-P1-006 degraded Driver replay cannot bypass Command safety gates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("navigator", { onLine: true });
    reportDefectViaCommand.mockReset();
    commandSignOnDuty.mockReset();
  });

  it("replays queued defects through Command and keeps 403 VOR/ineligible rejections", async () => {
    const { enqueueOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueOpsCommand(
      "drv-gate",
      { type: "defect", payload: { description: "Brake failure", clientId: "def-gate-1" } },
      "co-bct",
      "mem-1",
    );

    reportDefectViaCommand.mockResolvedValue({
      ok: false,
      status: 403,
      code: "vehicle_vor",
      message: "Vehicle is VOR and cannot accept this report locally.",
    });

    const result = await flushOpsOutbox(
      { id: "drv-gate", organisation_id: "co-bct", user_id: "mem-1" },
      { companyId: "co-bct", membershipId: "mem-1" },
    );

    expect(reportDefectViaCommand).toHaveBeenCalled();
    expect(result.blocked).toBe(1);
    expect(result.synced).toBe(0);
    const remaining = await loadOpsOutbox("drv-gate", "co-bct", "mem-1");
    expect(remaining[0].status).toBe("RECONCILIATION_REQUIRED");
    expect(remaining[0].payload.acceptedLocally).toBeUndefined();
  });

  it("does not locally accept a duty sign-on that Command still blocks", async () => {
    const { enqueueDutyOpsCommand, loadOpsOutbox } = await import("@/lib/driver-ops-outbox.storage");
    const { flushOpsOutbox } = await import("@/services/driver-ops-outbox.service");

    await enqueueDutyOpsCommand("drv-gate", "duty_sign_on", "duty-blocked", "co-bct", "mem-1");
    commandSignOnDuty.mockResolvedValue({
      ok: false,
      status: 403,
      code: "ineligible",
      message: "Driver is not eligible to sign on.",
      blocked: true,
    });

    const result = await flushOpsOutbox(
      { id: "drv-gate", organisation_id: "co-bct", user_id: "mem-1" },
      { companyId: "co-bct", membershipId: "mem-1" },
    );

    expect(commandSignOnDuty).toHaveBeenCalledWith("tok", "duty-blocked");
    expect(result.synced).toBe(0);
    expect((await loadOpsOutbox("drv-gate", "co-bct", "mem-1"))[0].status).toBe("RECONCILIATION_REQUIRED");
  });
});
