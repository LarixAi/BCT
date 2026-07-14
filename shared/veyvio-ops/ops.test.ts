import { describe, expect, it } from "vitest";
import {
  canStartJourney,
  applyStartJourney,
  readinessCoversVehicle,
  buildVehicleReadiness,
  canTransitionDuty,
  SCHOOL_MORNING_JOURNEY,
} from "./index";

describe("@veyvio/ops", () => {
  it("exports school morning journey identity", () => {
    expect(SCHOOL_MORNING_JOURNEY.displayName).toContain("School Route 104");
  });

  it("blocks startJourney without clock-in", () => {
    expect(canStartJourney({ dutyStatus: "delivered", journeyStatus: "ready" }).allowed).toBe(false);
  });

  it("transitions duty clocked_in → active only via startJourney side effect", () => {
    expect(canTransitionDuty("clocked_in", "active")).toBe(true);
    const result = applyStartJourney(
      [
        {
          identity: { ...SCHOOL_MORNING_JOURNEY },
          dutyId: "d1",
          status: "ready",
        },
      ],
      SCHOOL_MORNING_JOURNEY.journeyId,
      "clocked_in",
    );
    expect(result.dutyStatus).toBe("active");
  });

  it("vehicle readiness is vehicle scoped", () => {
    const readiness = buildVehicleReadiness({
      vehicleId: "a",
      assignmentId: "asgn",
      checkSessionId: "c1",
      outcome: "RELEASED_NO_DEFECTS",
    });
    expect(readinessCoversVehicle(readiness, "b")).toBe(false);
  });
});
