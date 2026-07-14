import { describe, expect, it } from "vitest";
import {
  SCHOOL_MORNING_JOURNEY,
  applyStartJourney,
  canStartJourney,
  readinessCoversVehicle,
  buildVehicleReadiness,
  applyClockInDuty,
} from "@veyvio/ops";
import { canStartJourneyForDuty, canClockInDuty } from "@/domain/duty/duty-state-machine";
import { isDevAuthBypassEnabled, resolveDemoParam, canSeedOperationalDemo } from "@/platform/dev/dev-guards";
import { toOpsCheckOutcome } from "@/domain/vehicle-check/check-outcomes";
import {
  getMockDutyDetail,
  mutateMockDuty,
  getVehicleReadiness,
  setVehicleReadiness,
} from "@/data/mocks/duties";
import type { OutboxMutation } from "@/types/sync";

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

describe("ops domain — Phase 1 foundations", () => {
  it("uses one display identity for School Route 104", () => {
    expect(SCHOOL_MORNING_JOURNEY.runCode).toBe("RUN-104-AM");
    expect(SCHOOL_MORNING_JOURNEY.displayName).toBe("School Route 104 – Morning Run");
    expect(getMockDutyDetail("duty_1")?.routeName).toBe(SCHOOL_MORNING_JOURNEY.displayName);
  });

  it("cannot startJourney unless duty is clocked_in or active", () => {
    expect(
      canStartJourney({ dutyStatus: "acknowledged", journeyStatus: "ready" }).allowed,
    ).toBe(false);
    expect(canStartJourney({ dutyStatus: "clocked_in", journeyStatus: "ready" }).allowed).toBe(true);
  });

  it("startJourney on j1 does not change j2", () => {
    const journeys = [
      {
        identity: { ...SCHOOL_MORNING_JOURNEY, journeyId: "j1", version: 1 },
        dutyId: "duty_1",
        status: "ready" as const,
      },
      {
        identity: {
          journeyId: "j2",
          runId: "run_2",
          runCode: "RUN-B",
          displayName: "Other",
          version: 1,
        },
        dutyId: "duty_1",
        status: "ready" as const,
      },
    ];
    const result = applyStartJourney(journeys, "j1", "clocked_in");
    expect(result.journeys.find((j) => j.identity.journeyId === "j1")?.status).toBe("in_progress");
    expect(result.journeys.find((j) => j.identity.journeyId === "j2")?.status).toBe("ready");
    expect(result.dutyStatus).toBe("active");
  });

  it("check readiness for vehicle A does not release vehicle B", () => {
    const a = buildVehicleReadiness({
      vehicleId: "veh_lk23",
      assignmentId: "asgn_school_am",
      checkSessionId: "vc_a",
      outcome: "RELEASED_NO_DEFECTS",
    });
    expect(readinessCoversVehicle(a, "veh_lk23", "asgn_school_am")).toBe(true);
    expect(readinessCoversVehicle(a, "veh_wx21", "asgn_community_7")).toBe(false);
  });

  it("mock: journey.start requires clock_in", () => {
    const duty = getMockDutyDetail("duty_1");
    expect(duty).toBeTruthy();
    // Ensure ready + check cleared for test isolation path
    mutateMockDuty(mutation("duty.acknowledge", { dutyId: "duty_1" }));
    mutateMockDuty(mutation("vehicle.verify", { dutyId: "duty_1", vehicleId: "veh_lk23" }));
    mutateMockDuty(
      mutation("vehicle.check.submit", {
        dutyId: "duty_1",
        vehicleId: "veh_lk23",
        assignmentId: "asgn_duty_1",
        checklist: {},
        hasDefect: false,
      }),
    );

    expect(() =>
      mutateMockDuty(
        mutation("journey.start", {
          dutyId: "duty_1",
          journeyId: SCHOOL_MORNING_JOURNEY.runId,
        }),
      ),
    ).toThrow(/clock/i);

    mutateMockDuty(mutation("duty.clock_in", { dutyId: "duty_1", fitForDutyDeclared: true }));
    mutateMockDuty(
      mutation("journey.start", {
        dutyId: "duty_1",
        journeyId: SCHOOL_MORNING_JOURNEY.runId,
      }),
    );
    expect(getMockDutyDetail("duty_1")?.lifecycleStatus).toBe("in_progress");
  });

  it("mock: check for LK23 does not clear WX21 duty", () => {
    setVehicleReadiness(
      buildVehicleReadiness({
        vehicleId: "veh_lk23",
        assignmentId: "asgn_school_am",
        checkSessionId: "vc_lk",
        outcome: "RELEASED_NO_DEFECTS",
      }),
    );
    mutateMockDuty(
      mutation("vehicle.check.submit", {
        dutyId: "duty_3",
        vehicleId: "veh_lk23",
        assignmentId: "asgn_school_am",
        hasDefect: false,
      }),
    );
    const community = getMockDutyDetail("duty_3");
    expect(community?.vehicle?.id).toBe("veh_wx21");
    // submitting LK23 check against duty_3 must not release WX21
    expect(community?.vehicleCheck.canStartDuty).toBe(false);
    expect(getVehicleReadiness("veh_lk23")?.status).toBe("released");
  });

  it("maps legacy outcomes to ops outcomes", () => {
    expect(toOpsCheckOutcome("nil_defects")).toBe("RELEASED_NO_DEFECTS");
    expect(toOpsCheckOutcome("safety_critical_blocked")).toBe("VOR");
    expect(toOpsCheckOutcome("defect_awaiting_review")).toBe("HELD_PENDING_REVIEW");
  });

  it("clock-in gate is separate from journey start", () => {
    expect(
      canClockInDuty({
        lifecycleStatus: "ready",
        vehicleVerified: true,
        vehicleCheckCanStart: true,
        eligibility: {
          status: "eligible",
          evaluatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          policyVersion: "eligibility-policy-v1",
          blockers: [],
          warnings: [],
        },
        alreadyClockedIn: false,
      }).allowed,
    ).toBe(true);
    expect(
      canStartJourneyForDuty({
        lifecycleStatus: "ready",
        vehicleCheckCanStart: true,
      }).allowed,
    ).toBe(false);
  });

  it("applyClockInDuty does not start a journey status on duty machine alone", () => {
    expect(applyClockInDuty("acknowledged")).toBe("clocked_in");
  });

  it("demo params and auth bypass are DEV-gated", () => {
    // In vitest, import.meta.env.DEV is typically true
    if (import.meta.env.DEV) {
      expect(canSeedOperationalDemo()).toBe(true);
      expect(resolveDemoParam("active")).toBe("active");
    } else {
      expect(canSeedOperationalDemo()).toBe(false);
      expect(resolveDemoParam("active")).toBeUndefined();
      expect(isDevAuthBypassEnabled()).toBe(false);
    }
  });
});
