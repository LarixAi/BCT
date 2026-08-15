import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyDutyNavAction,
  clearDutyNavProgress,
  createMemoryDutyNavStore,
  setDutyNavStoreForTests,
} from "@/lib/command-duty-nav-job";
import { applyDutyNavActionWithOutbox } from "@/lib/command-duty-nav-outbox";

vi.mock("@/lib/command-api", () => ({
  getCommandApiBaseUrl: vi.fn(() => "https://command.example/functions/v1/command-api"),
}));

vi.mock("@/lib/driver-ops-outbox.storage", () => ({
  enqueueOpsCommand: vi.fn(async () => 1),
}));

vi.mock("@/lib/command-duty-nav-server", () => ({
  applyDutyNavActionAsync: vi.fn(async (duty, action) => applyDutyNavAction(duty, action)),
}));

import { getCommandApiBaseUrl } from "@/lib/command-api";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";

const duty = {
  id: "duty-offline-1",
  lifecycleStatus: "in_progress",
  actualSignOnAt: "2026-07-25T08:00:00.000Z",
  primaryJourneyId: "run-offline-1",
  runs: [
    {
      id: "run-offline-1",
      journeyId: "run-offline-1",
      stops: [
        {
          id: "stop_1",
          stopOrder: 1,
          name: "Pickup",
          latitude: 51.55,
          longitude: -0.29,
          kind: "passenger_pickup",
          passengerTasks: [{ passengerName: "Alex" }],
        },
      ],
    },
  ],
};

const driver = { id: "drv-1", companyId: "co-1", membershipId: "mem-1" };
const session = { activeCompanyId: "co-1", membershipId: "mem-1" };

describe("applyDutyNavActionWithOutbox", () => {
  beforeEach(() => {
    setDutyNavStoreForTests(createMemoryDutyNavStore());
    clearDutyNavProgress(duty.id);
    vi.clearAllMocks();
    getCommandApiBaseUrl.mockReturnValue("https://command.example/functions/v1/command-api");
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    setDutyNavStoreForTests(null);
    vi.unstubAllGlobals();
  });

  it("queues journey arrive when offline and updates local progress", async () => {
    vi.stubGlobal("navigator", { onLine: false });

    const result = await applyDutyNavActionWithOutbox(duty, "arrive", { driver, session });

    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
    expect(enqueueOpsCommand).toHaveBeenCalledWith(
      "drv-1",
      expect.objectContaining({
        type: "journey_stop_arrive",
        payload: expect.objectContaining({ journeyId: "run-offline-1" }),
      }),
      "co-1",
      "mem-1",
    );
    expect(result.job.stops[0].status).toBe("arrived");
  });

  it("keeps pickup confirmation local when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await applyDutyNavActionWithOutbox(duty, "arrive", { driver, session });

    const pickup = await applyDutyNavActionWithOutbox(duty, "confirm_pickup", { driver, session });
    expect(pickup.ok).toBe(true);
    expect(enqueueOpsCommand).toHaveBeenCalledTimes(1);
  });
});
