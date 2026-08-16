import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeDurableConnection,
  installMemoryIndexedDbForTests,
  resetMemoryIndexedDbForTests,
} from "@/lib/driver-durable-kv";
import { closeWalkaroundMediaConnection, countPendingWalkaroundMedia } from "@/lib/walkaround-media-outbox";
import { loadSyncQueue } from "@/lib/walkaround-sync.storage";
import { commandSubmitVehicleCheck } from "@/lib/command-api";
import {
  flushPendingWalkaroundSubmissions,
  submitWalkaroundCheck,
} from "@/services/vehicle-check.service";

const submitVehicleCheckViaCommand = vi.fn();

vi.mock("@/services/command-driver-ops.service", () => ({
  submitVehicleCheckViaCommand: (...args) => submitVehicleCheckViaCommand(...args),
  listTodayVehicleChecksViaCommand: async () => ({ ok: true, checks: [] }),
  listVehicleCheckHistoryViaCommand: async () => ({ ok: true, checks: [] }),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabaseAnonKey: () => "ci-anon-key",
}));

vi.mock("@/lib/command-api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getCommandApiBaseUrl: () => "https://example.supabase.co/functions/v1/command-api",
  };
});

function baseInput(overrides = {}) {
  return {
    driver: { id: "drv-1", organisation_id: "co-a", membership_id: "mem-1" },
    vehicle: { id: "veh-1", registration: "YX25 VEY" },
    job: { id: "duty-1" },
    profile: {},
    checklist: {
      items: [
        {
          id: "mirrors",
          sectionKey: "cab",
          category: "visibility",
          questionTitle: "Mirrors",
          defaultSeverity: "major",
          autoBlockOnFail: false,
          requiresPhotoOnFail: false,
        },
      ],
    },
    answers: { mirrors: { status: "pass" } },
    checkType: "daily_walkaround",
    odometerReading: 45231,
    odometerPhotoDataUrl: "data:image/jpeg;base64,b2Rv",
    fuelLevel: "3/4",
    vehicleConfirmed: true,
    declarationSigned: true,
    additionalDefectNote: "",
    gps: null,
    startedAt: "2026-08-16T09:46:10.828Z",
    driverSignatureDataUrl: "data:image/png;base64,c2ln",
    session: { membershipId: "mem-1", activeCompanyId: "co-a", companyId: "co-a" },
    ...overrides,
  };
}

describe("walkaround clientCheckId idempotency", () => {
  beforeEach(() => {
    installMemoryIndexedDbForTests();
    submitVehicleCheckViaCommand.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" });
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
  });

  afterEach(() => {
    closeWalkaroundMediaConnection();
    closeDurableConnection();
    resetMemoryIndexedDbForTests();
    vi.unstubAllGlobals();
  });

  it("persists one clientCheckId from offline enqueue through reload and replay", async () => {
    const result = await submitWalkaroundCheck(baseInput());
    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);

    const queued = await loadSyncQueue("drv-1", "co-a", "mem-1");
    expect(queued).toHaveLength(1);
    const K = queued[0].payload.clientCheckId;
    expect(K).toBe("11111111-2222-4333-8444-555555555555");
    expect(queued[0].id).toBe(K);
    expect(queued[0].idempotencyKey).toBe(K);
    expect(queued[0].status).toBe("PENDING");
    expect(await countPendingWalkaroundMedia("co-a", "mem-1")).toBe(2);

    vi.stubGlobal("crypto", { randomUUID: () => "should-not-be-used-on-reload" });
    const reloaded = await loadSyncQueue("drv-1", "co-a", "mem-1");
    expect(reloaded[0].payload.clientCheckId).toBe(K);
    expect(reloaded[0].idempotencyKey).toBe(K);

    vi.stubGlobal("navigator", { onLine: true });
    submitVehicleCheckViaCommand.mockResolvedValueOnce({
      ok: false,
      message: "Command temporarily unavailable.",
    });
    const firstFlush = await flushPendingWalkaroundSubmissions(
      { id: "drv-1", organisation_id: "co-a", membership_id: "mem-1" },
      { membershipId: "mem-1", activeCompanyId: "co-a", companyId: "co-a" },
    );
    expect(firstFlush.synced).toBe(0);
    expect(firstFlush.remaining).toBe(1);
    expect(submitVehicleCheckViaCommand).toHaveBeenCalledTimes(1);
    expect(submitVehicleCheckViaCommand.mock.calls[0][0].clientCheckId).toBe(K);
    expect((await loadSyncQueue("drv-1", "co-a", "mem-1"))[0].payload.clientCheckId).toBe(K);
    expect(await countPendingWalkaroundMedia("co-a", "mem-1")).toBe(2);

    submitVehicleCheckViaCommand.mockResolvedValueOnce({
      ok: true,
      check: { id: "4742ddd5-b23b-40ed-810b-08bee434607d", clientCheckId: K },
    });
    const secondFlush = await flushPendingWalkaroundSubmissions(
      { id: "drv-1", organisation_id: "co-a", membership_id: "mem-1" },
      { membershipId: "mem-1", activeCompanyId: "co-a", companyId: "co-a" },
    );
    expect(secondFlush.synced).toBe(1);
    expect(secondFlush.remaining).toBe(0);
    expect(submitVehicleCheckViaCommand).toHaveBeenCalledTimes(2);
    expect(submitVehicleCheckViaCommand.mock.calls[1][0].clientCheckId).toBe(K);
    expect(await loadSyncQueue("drv-1", "co-a", "mem-1")).toHaveLength(0);
    expect(await countPendingWalkaroundMedia("co-a", "mem-1")).toBe(0);
  });

  it("keeps queue and media when Command rejects without acceptance", async () => {
    await submitWalkaroundCheck(baseInput());
    vi.stubGlobal("navigator", { onLine: true });
    submitVehicleCheckViaCommand.mockResolvedValue({
      ok: false,
      status: 500,
      message: "database_error",
    });
    await flushPendingWalkaroundSubmissions(
      { id: "drv-1", organisation_id: "co-a", membership_id: "mem-1" },
      { membershipId: "mem-1", activeCompanyId: "co-a", companyId: "co-a" },
    );
    expect(await loadSyncQueue("drv-1", "co-a", "mem-1")).toHaveLength(1);
    expect(await countPendingWalkaroundMedia("co-a", "mem-1")).toBe(2);
  });
});

describe("Command duplicate vehicle-check POST", () => {
  it("treats a 200 replay of the same clientCheckId as the same authoritative check", async () => {
    vi.stubEnv("VITE_COMMAND_API_BASE_URL", "https://example.supabase.co/functions/v1/command-api");
    const fetchMock = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      expect(body.clientCheckId).toBe("stable-k");
      return {
        ok: true,
        json: async () => ({ id: "record-r", clientCheckId: "stable-k" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = await commandSubmitVehicleCheck("token", { clientCheckId: "stable-k", vehicleId: "veh-1" });
    const second = await commandSubmitVehicleCheck("token", { clientCheckId: "stable-k", vehicleId: "veh-1" });
    expect(first.check.id).toBe("record-r");
    expect(second.check.id).toBe("record-r");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
