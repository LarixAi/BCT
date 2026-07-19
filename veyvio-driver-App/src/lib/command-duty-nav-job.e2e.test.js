import { afterEach, describe, expect, it } from "vitest";
import { getJobExecutionState } from "@/lib/jobExecutionState";
import {
  applyDutyNavAction,
  clearDutyNavProgress,
  commandDutyToNavJob,
  createMemoryDutyNavStore,
  runDutyJourneyToCompletion,
  setDutyNavStoreForTests,
} from "@/lib/command-duty-nav-job";

function buildSchoolDuty({ pickups = 2 } = {}) {
  const pickupStops = Array.from({ length: pickups }, (_, index) => {
    const n = index + 1;
    return {
      id: `stop_pickup_${n}`,
      stopOrder: n,
      name: `${40 + n} Ealing Road`,
      address: `${40 + n} Ealing Road, Wembley`,
      latitude: 51.55 + n * 0.001,
      longitude: -0.29 - n * 0.001,
      status: "scheduled",
      kind: "passenger_pickup",
      passengerTasks: [
        {
          id: `pt_${n}`,
          passengerId: `p_${n}`,
          passengerName: n === 1 ? "Amelia Clarke" : `Passenger ${n}`,
          type: "pickup",
          status: "scheduled",
        },
      ],
    };
  });

  return {
    id: "duty-e2e-s19",
    reference: "S19-AM-075955",
    routeName: "S19-AM-075955",
    dutyDate: "2026-07-19",
    startTime: "05:45",
    endTime: "09:00",
    lifecycleStatus: "in_progress",
    actualSignOnAt: "2026-07-19T08:24:00.000Z",
    reportingLocation: "Primary depot Wembley",
    vehicle: {
      id: "veh-1",
      registrationNumber: "YX25 VEY",
    },
    runs: [
      {
        id: "run-1",
        name: "S19-AM-075955",
        status: "in_progress",
        stops: [
          ...pickupStops,
          {
            id: "stop_school_drop",
            stopOrder: pickups + 1,
            name: "Oakington Manor Primary School",
            address: "Oakington Manor Drive, Wembley",
            latitude: 51.552,
            longitude: -0.285,
            status: "scheduled",
            kind: "passenger_dropoff",
            passengerTasks: pickupStops.flatMap((stop) =>
              (stop.passengerTasks ?? []).map((task) => ({
                ...task,
                id: `drop_${task.id}`,
                type: "dropoff",
                stopId: "stop_school_drop",
              })),
            ),
          },
        ],
      },
    ],
  };
}

describe("e2e: Command duty arrive → pickup → complete", () => {
  afterEach(() => {
    setDutyNavStoreForTests(null);
  });

  it("runs a full school duty from first pickup through school drop-off", () => {
    setDutyNavStoreForTests(createMemoryDutyNavStore());
    const duty = buildSchoolDuty({ pickups: 2 });

    const result = runDutyJourneyToCompletion(duty);

    expect(result.ok).toBe(true);
    expect(result.job.stops.every((s) => s.status === "completed")).toBe(true);
    expect(result.events.at(-1)?.allDone).toBe(true);

    const actions = result.events.map((e) => e.action);
    expect(actions.filter((a) => a === "arrive").length).toBe(3);
    expect(actions.filter((a) => a === "confirm_pickup").length).toBe(2);
    expect(actions).toContain("confirm_dropoff");
    expect(actions).toContain("complete_job");

    // First stop sequence is arrive → confirm pickup → leave
    expect(result.events.slice(0, 3).map((e) => e.action)).toEqual([
      "arrive",
      "confirm_pickup",
      "complete_stop",
    ]);
  });

  it("lets the driver confirm arrival even when GPS is not near the stop", () => {
    setDutyNavStoreForTests(createMemoryDutyNavStore());
    const duty = buildSchoolDuty({ pickups: 1 });
    clearDutyNavProgress(duty.id);

    let job = commandDutyToNavJob(duty, { autoStart: true });
    let execution = getJobExecutionState(job, { isActive: true });
    expect(execution.primaryAction).toBe("arrive");
    expect(execution.primaryLabel).toBe("I've arrived");

    const arrived = applyDutyNavAction(duty, "arrive");
    expect(arrived.ok).toBe(true);
    job = arrived.job;
    execution = getJobExecutionState(job, { isActive: true });
    expect(execution.phase).toBe("boarding");
    expect(execution.primaryAction).toBe("confirm_pickup");
    expect(execution.primaryLabel).toMatch(/Amelia Clarke/);
  });

  it("blocks leaving a pickup before passenger confirmation", () => {
    setDutyNavStoreForTests(createMemoryDutyNavStore());
    const duty = buildSchoolDuty({ pickups: 1 });
    clearDutyNavProgress(duty.id);

    expect(applyDutyNavAction(duty, "arrive").ok).toBe(true);
    const blocked = applyDutyNavAction(duty, "complete_stop");
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/Confirm pickup/i);

    expect(applyDutyNavAction(duty, "confirm_pickup").ok).toBe(true);
    const left = applyDutyNavAction(duty, "complete_stop");
    expect(left.ok).toBe(true);
  });
});
