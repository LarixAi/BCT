import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const commandDriverBootstrap = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: { getSession },
  }),
}));

vi.mock("@/lib/command-api", () => ({
  commandDriverBootstrap: (...args) => commandDriverBootstrap(...args),
}));

describe("loadDriverBootstrap cache", () => {
  beforeEach(async () => {
    vi.resetModules();
    getSession.mockReset();
    commandDriverBootstrap.mockReset();
    getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    commandDriverBootstrap.mockResolvedValue({
      ok: true,
      bootstrap: { identity: { driverId: "d1" }, duties: [{ id: "duty-1" }] },
    });
  });

  it("dedupes concurrent callers and serves a short TTL cache", async () => {
    const mod = await import("@/services/driver-bootstrap.service");
    mod.invalidateDriverBootstrapCache();

    const [a, b] = await Promise.all([
      mod.loadDriverBootstrap({ depotId: "depot-1" }),
      mod.loadDriverBootstrap({ depotId: "depot-1" }),
    ]);

    expect(commandDriverBootstrap).toHaveBeenCalledTimes(1);
    expect(a.ok).toBe(true);
    expect(b.bootstrap?.duties?.[0]?.id).toBe("duty-1");

    const cached = await mod.loadDriverBootstrap({ depotId: "depot-2" });
    expect(commandDriverBootstrap).toHaveBeenCalledTimes(1);
    expect(cached.bootstrap?.duties?.[0]?.id).toBe("duty-1");

    const forced = await mod.loadDriverBootstrap({ depotId: "depot-2", force: true });
    expect(commandDriverBootstrap).toHaveBeenCalledTimes(2);
    expect(forced.ok).toBe(true);
  });

  it("seeds cache from an existing session bootstrap", async () => {
    const mod = await import("@/services/driver-bootstrap.service");
    mod.invalidateDriverBootstrapCache();
    mod.seedDriverBootstrapCache({ identity: { driverId: "seeded" }, duties: [] }, "depot-9");

    const result = await mod.loadDriverBootstrap({ depotId: "depot-9" });
    expect(commandDriverBootstrap).not.toHaveBeenCalled();
    expect(result.bootstrap?.identity?.driverId).toBe("seeded");
  });
});

describe("mergeDutyState", () => {
  it("keeps Command off-duty when legacy Ridova shift is signed on", async () => {
    const { mergeDutyState } = await import("@/services/driver-bootstrap.service");
    const command = {
      isSignedOn: false,
      isShiftEnded: false,
      source: "command",
      dutyId: "duty-1",
    };
    const legacy = {
      isSignedOn: true,
      isShiftEnded: false,
      source: "ridova",
      shift: { signOnAt: "2026-07-24T06:00:00.000Z", signOffAt: null },
    };

    expect(mergeDutyState(command, legacy)).toEqual(command);
  });

  it("prefers Command sign-on and merges missing vehicle details from legacy", async () => {
    const { mergeDutyState } = await import("@/services/driver-bootstrap.service");
    const command = {
      isSignedOn: true,
      isShiftEnded: false,
      source: "command",
      shift: { signOnAt: "2026-07-24T06:05:00.000Z", signOffAt: null },
      primaryVehicle: null,
    };
    const legacy = {
      isSignedOn: true,
      primaryVehicle: { registration: "AB12 CDE", id: "veh-1" },
      scheduledStart: "06:00",
    };

    expect(mergeDutyState(command, legacy)).toMatchObject({
      isSignedOn: true,
      source: "command",
      primaryVehicle: { registration: "AB12 CDE", id: "veh-1" },
      scheduledStart: "06:00",
      shift: { signOnAt: "2026-07-24T06:05:00.000Z", signOffAt: null },
    });
  });

  it("falls back to legacy only when Command duty state is absent", async () => {
    const { mergeDutyState } = await import("@/services/driver-bootstrap.service");
    const legacy = { isSignedOn: true, source: "ridova" };
    expect(mergeDutyState(null, legacy)).toBe(legacy);
    expect(mergeDutyState(undefined, legacy)).toBe(legacy);
  });
});

describe("commandDutyStateFromBootstrap", () => {
  it("does not infer sign-on from legacy trips schedule when duties say off duty", async () => {
    const { commandDutyStateFromBootstrap } = await import("@/services/driver-bootstrap.service");
    const bootstrap = {
      duties: [
        {
          id: "duty-1",
          lifecycleStatus: "published",
          actualSignOnAt: null,
          actualSignOffAt: null,
        },
      ],
      legacy: {
        tripsSchedule: {
          today: [
            {
              primaryActionLabel: "On duty",
              status: "in_progress",
              vehicleRegistration: "AB12 CDE",
              scheduledStart: "06:00",
            },
          ],
        },
      },
    };

    expect(commandDutyStateFromBootstrap(bootstrap, null)).toMatchObject({
      isSignedOn: false,
      isShiftEnded: false,
      scheduledStart: "06:00",
      primaryVehicle: { registration: "AB12 CDE" },
    });
  });

  it("keeps Command sign-on from duties over legacy schedule hints", async () => {
    const { commandDutyStateFromBootstrap } = await import("@/services/driver-bootstrap.service");
    const bootstrap = {
      duties: [
        {
          id: "duty-1",
          lifecycleStatus: "in_progress",
          actualSignOnAt: "2026-07-24T06:05:00.000Z",
          vehicle: { registrationNumber: "ISO1 AAA", id: "veh-1" },
        },
      ],
      legacy: {
        tripsSchedule: {
          today: [{ primaryActionLabel: "View duty", status: "scheduled", scheduledStart: "06:00" }],
        },
      },
    };

    expect(commandDutyStateFromBootstrap(bootstrap, null)).toMatchObject({
      isSignedOn: true,
      dutyId: "duty-1",
      scheduledStart: "06:00",
    });
  });
});
