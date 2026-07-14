import { describe, expect, it, beforeEach } from "vitest";
import {
  getMockDutyDetail,
  mutateMockDuty,
  resetMockDutyStoreForTests,
} from "@/data/mocks/duties";
import type { OutboxMutation } from "@/types/sync";
import { SCHOOL_MORNING_JOURNEY } from "@veyvio/ops";
import { getHeadingStop } from "@/domain/journey/journey-helpers";

function mutation(type: OutboxMutation["type"], payload: Record<string, unknown>): OutboxMutation {
  return {
    localOperationId: `local_${Math.random()}`,
    type,
    companyId: "co",
    depotId: "dep",
    userId: "drv",
    deviceId: "dev",
    createdAt: new Date().toISOString(),
    payload,
    status: "pending",
  };
}

describe("nav stop advance after boarding", () => {
  beforeEach(() => {
    resetMockDutyStoreForTests();
  });

  it("boarding completes current stop and points heading at the next pickup", () => {
    mutateMockDuty(mutation("duty.acknowledge", { dutyId: "duty_1" }));
    mutateMockDuty(mutation("vehicle.verify", { dutyId: "duty_1", vehicleId: "veh_lk23" }));
    mutateMockDuty(
      mutation("vehicle.check.submit", {
        dutyId: "duty_1",
        vehicleId: "veh_lk23",
        assignmentId: "asgn_duty_1",
        hasDefect: false,
      }),
    );
    mutateMockDuty(mutation("duty.clock_in", { dutyId: "duty_1", fitForDutyDeclared: true }));
    mutateMockDuty(
      mutation("journey.start", {
        dutyId: "duty_1",
        journeyId: SCHOOL_MORNING_JOURNEY.runId,
      }),
    );

    const before = getMockDutyDetail("duty_1");
    expect(before).toBeTruthy();
    const headingBefore = getHeadingStop(before!);
    expect(headingBefore?.id).toBe("stop_1");

    mutateMockDuty(
      mutation("passenger.outcome", {
        dutyId: "duty_1",
        stopId: "stop_1",
        passengerId: "pax_amelia",
        pickupOutcome: "boarded",
      }),
    );

    const after = getMockDutyDetail("duty_1");
    expect(after?.runs[0]?.stops.find((s) => s.id === "stop_1")?.status).toBe("completed");
    expect(after?.runs[0]?.stops.find((s) => s.id === "stop_2")?.status).toBe("approaching");
    expect(getHeadingStop(after!)?.id).toBe("stop_2");
  });
});
