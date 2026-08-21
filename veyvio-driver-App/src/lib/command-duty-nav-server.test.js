import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyDutyNavAction,
  clearDutyNavProgress,
  createMemoryDutyNavStore,
  setDutyNavStoreForTests,
} from "@/lib/command-duty-nav-job";
import { applyDutyNavActionAsync } from "@/lib/command-duty-nav-server";

vi.mock("@/lib/command-api", () => ({
  getCommandApiBaseUrl: vi.fn(() => "https://command.example/functions/v1/command-api"),
}));

vi.mock("@/services/command-driver-ops.service", () => ({
  startJourney: vi.fn(async () => ({ ok: true })),
  arriveJourneyStop: vi.fn(async () => ({ ok: true })),
  completeJourneyStop: vi.fn(async () => ({ ok: true })),
  completeJourney: vi.fn(async () => ({ ok: true })),
}));

import { getCommandApiBaseUrl } from "@/lib/command-api";
import {
  arriveJourneyStop,
  completeJourney,
  completeJourneyStop,
  startJourney,
} from "@/services/command-driver-ops.service";

const duty = {
  id: "duty-server-1",
  lifecycleStatus: "in_progress",
  actualSignOnAt: "2026-07-25T08:00:00.000Z",
  primaryJourneyId: "run-server-1",
  runs: [
    {
      id: "run-server-1",
      journeyId: "run-server-1",
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
        {
          id: "stop_2",
          stopOrder: 2,
          name: "School",
          latitude: 51.552,
          longitude: -0.285,
          kind: "passenger_dropoff",
          passengerTasks: [{ passengerName: "Alex" }],
        },
      ],
    },
  ],
};

describe("applyDutyNavActionAsync", () => {
  beforeEach(() => {
    setDutyNavStoreForTests(createMemoryDutyNavStore());
    clearDutyNavProgress(duty.id);
    vi.clearAllMocks();
    getCommandApiBaseUrl.mockReturnValue("https://command.example/functions/v1/command-api");
  });

  afterEach(() => {
    setDutyNavStoreForTests(null);
  });

  it("calls Command before persisting arrive", async () => {
    const result = await applyDutyNavActionAsync(duty, "arrive");
    expect(result.ok).toBe(true);
    expect(startJourney).toHaveBeenCalledWith("run-server-1");
    expect(arriveJourneyStop).toHaveBeenCalledWith(
      "run-server-1",
      expect.objectContaining({ sequence: 1, label: "Pickup" }),
    );
    expect(result.job.stops[0].status).toBe("arrived");
  });

  it("rejects when Command rejects the transition", async () => {
    arriveJourneyStop.mockResolvedValueOnce({
      ok: false,
      message: "Sign on to your duty before starting a journey",
    });

    const result = await applyDutyNavActionAsync(duty, "arrive");
    expect(result.ok).toBe(false);
    expect(result.serverRejected).toBe(true);
    expect(applyDutyNavAction(duty, "arrive").ok).toBe(true);
  });

  it("keeps pickup confirmation local-only", async () => {
    await applyDutyNavActionAsync(duty, "arrive");
    const pickup = await applyDutyNavActionAsync(duty, "confirm_pickup");
    expect(pickup.ok).toBe(true);
    expect(completeJourneyStop).not.toHaveBeenCalled();
  });

  it("completes journey on Command when final stop finishes", async () => {
    await applyDutyNavActionAsync(duty, "arrive");
    await applyDutyNavActionAsync(duty, "confirm_pickup");
    await applyDutyNavActionAsync(duty, "complete_stop");

    await applyDutyNavActionAsync(duty, "arrive");
    await applyDutyNavActionAsync(duty, "confirm_dropoff");
    const done = await applyDutyNavActionAsync(duty, "complete_job");

    expect(done.ok).toBe(true);
    expect(done.allDone).toBe(true);
    expect(completeJourney).toHaveBeenCalledWith("run-server-1", {
      outcome: "duty_stops_complete",
    });
  });

  it("falls back to local progress when Command API is not configured", async () => {
    getCommandApiBaseUrl.mockReturnValue("");
    const result = await applyDutyNavActionAsync(duty, "arrive");
    expect(result.ok).toBe(true);
    expect(arriveJourneyStop).not.toHaveBeenCalled();
  });
});
