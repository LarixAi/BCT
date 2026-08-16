import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  closeDurableConnection,
  installMemoryIndexedDbForTests,
  resetMemoryIndexedDbForTests,
} from "@/lib/driver-durable-kv"
import { ITEM_RECONCILIATION } from "@/lib/driver-durable-queue"
import {
  enqueueWalkaroundSubmission,
  loadSyncQueue,
  markWalkaroundReconciliation,
  revalidateWalkaroundSubmission,
} from "@/lib/walkaround-sync.storage"
import { flushDriverOfflineQueues } from "@/services/driver-offline-flush"

const submitVehicleCheckViaCommand = vi.fn()

vi.mock("@/services/command-driver-ops.service", () => ({
  submitVehicleCheckViaCommand: (...args) => submitVehicleCheckViaCommand(...args),
  listTodayVehicleChecksViaCommand: async () => ({ ok: true, checks: [] }),
  listVehicleCheckHistoryViaCommand: async () => ({ ok: true, checks: [] }),
}))

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabaseAnonKey: () => "ci-anon-key",
}))

vi.mock("@/lib/command-api", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getCommandApiBaseUrl: () => "https://example.supabase.co/functions/v1/command-api",
  }
})

const DRIVER = { id: "drv-1", organisation_id: "co-a", membership_id: "mem-1" }
const SESSION = { membershipId: "mem-1", activeCompanyId: "co-a", companyId: "co-a" }

function queuedPayload(clientCheckId) {
  return {
    clientCheckId,
    driver: DRIVER,
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
    odometerReading: 48250,
    fuelLevel: "3/4",
    vehicleConfirmed: true,
    declarationSigned: true,
    additionalDefectNote: "",
    gps: null,
    startedAt: "2026-08-16T13:51:23.774Z",
    session: SESSION,
  }
}

describe("Offline & sync combined flush", () => {
  beforeEach(() => {
    installMemoryIndexedDbForTests()
    submitVehicleCheckViaCommand.mockReset()
    vi.stubGlobal("navigator", { onLine: true })
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })
  })

  afterEach(() => {
    closeDurableConnection()
    resetMemoryIndexedDbForTests()
    vi.unstubAllGlobals()
  })

  it("leaves an unrevalidated walkaround untouched and submits a revalidated one", async () => {
    await enqueueWalkaroundSubmission("drv-1", queuedPayload("k-held"), "co-a", "mem-1")
    await enqueueWalkaroundSubmission("drv-1", queuedPayload("k-retry"), "co-a", "mem-1")
    await markWalkaroundReconciliation("drv-1", "k-held", "co-a", "mem-1", { status: 403 })
    await markWalkaroundReconciliation("drv-1", "k-retry", "co-a", "mem-1", { status: 403 })

    submitVehicleCheckViaCommand.mockResolvedValue({
      ok: true,
      check: { id: "record-r", clientCheckId: "k-retry" },
    })

    const skipped = await flushDriverOfflineQueues(DRIVER, SESSION)
    expect(skipped.walkaroundSynced).toBe(0)
    expect(submitVehicleCheckViaCommand).not.toHaveBeenCalled()
    const afterSkip = await loadSyncQueue("drv-1", "co-a", "mem-1")
    expect(afterSkip.map((item) => item.id).sort()).toEqual(["k-held", "k-retry"])
    expect(afterSkip.every((item) => item.status === ITEM_RECONCILIATION)).toBe(true)

    await revalidateWalkaroundSubmission("drv-1", "k-retry", "co-a", "mem-1")

    const flushed = await flushDriverOfflineQueues(DRIVER, SESSION)
    expect(flushed.walkaroundSynced).toBe(1)
    expect(submitVehicleCheckViaCommand).toHaveBeenCalledTimes(1)
    expect(submitVehicleCheckViaCommand.mock.calls[0][0].clientCheckId).toBe("k-retry")

    const remaining = await loadSyncQueue("drv-1", "co-a", "mem-1")
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe("k-held")
    expect(remaining[0].status).toBe(ITEM_RECONCILIATION)
  })
})
