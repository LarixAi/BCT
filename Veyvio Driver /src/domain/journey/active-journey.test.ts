import { describe, expect, it } from "vitest";
import type { DutyDetail } from "@/types/duty";
import {
  custodyEndsAfterJourney,
  getActiveJourneyId,
  getNextJourney,
  hasRemainingJourneys,
} from "./active-journey";
import { canCompleteDuty } from "@/domain/duty/duty-state-machine";
import {
  dropoffHoldsForOperations,
  pickupAllowsRouteAdvance,
  pickupHoldsForOperations,
} from "@veyvio/ops";

function sampleDuty(overrides: Partial<DutyDetail> = {}): DutyDetail {
  return {
    id: "duty_1",
    reference: "TEST",
    dutyDate: "2026-07-14",
    startTime: "06:30",
    endTime: "09:15",
    lifecycleStatus: "in_progress",
    reportingLocation: "Depot",
    routeName: "Test",
    passengerCount: 1,
    escortRequired: false,
    vehicleVerified: true,
    vehicleCheck: {
      status: "cleared",
      canStartDuty: true,
      pendingManagerAdvice: false,
      checklist: {},
    },
    runs: [
      {
        id: "run_a",
        journeyId: "journey_a",
        name: "Morning",
        status: "active",
        stops: [],
      },
      {
        id: "run_b",
        journeyId: "journey_b",
        name: "Return",
        status: "scheduled",
        stops: [],
      },
    ],
    primaryJourneyId: "journey_a",
    activeJourneyId: "journey_a",
    ...overrides,
  };
}

describe("active journey model", () => {
  it("prefers status=active over runs[0]", () => {
    const duty = sampleDuty({
      runs: [
        { id: "run_a", journeyId: "journey_a", name: "A", status: "completed", stops: [] },
        { id: "run_b", journeyId: "journey_b", name: "B", status: "active", stops: [] },
      ],
    });
    expect(getActiveJourneyId(duty)).toBe("journey_b");
  });

  it("keeps custody when another journey remains", () => {
    const duty = sampleDuty();
    expect(custodyEndsAfterJourney(duty, "journey_a")).toBe(false);
    expect(hasRemainingJourneys(duty, "journey_a")).toBe(true);
    expect(getNextJourney(duty, "journey_a")?.journeyId).toBe("journey_b");
  });

  it("ends custody when completing the last open journey", () => {
    const duty = sampleDuty({
      runs: [
        { id: "run_a", journeyId: "journey_a", name: "A", status: "completed", stops: [] },
        { id: "run_b", journeyId: "journey_b", name: "B", status: "active", stops: [] },
      ],
    });
    expect(custodyEndsAfterJourney(duty, "journey_b")).toBe(true);
  });
});

describe("duty completion gate", () => {
  it("blocks while journeys remain incomplete", () => {
    const gate = canCompleteDuty(sampleDuty());
    expect(gate.allowed).toBe(false);
    expect(gate.blockers.some((b) => b.includes("journey"))).toBe(true);
  });

  it("blocks without handback even when journeys are done", () => {
    const gate = canCompleteDuty(
      sampleDuty({
        runs: [
          { id: "run_a", journeyId: "journey_a", name: "A", status: "completed", stops: [] },
          { id: "run_b", journeyId: "journey_b", name: "B", status: "completed", stops: [] },
        ],
      }),
    );
    expect(gate.allowed).toBe(false);
    expect(gate.blockers.some((b) => b.toLowerCase().includes("handback"))).toBe(true);
  });
});

describe("passenger exception holds", () => {
  it("holds unsafe pickup and authorises-person-absent drop-off", () => {
    expect(pickupHoldsForOperations("unsafe_to_board")).toBe(true);
    expect(pickupAllowsRouteAdvance("boarded")).toBe(true);
    expect(dropoffHoldsForOperations("authorised_person_absent")).toBe(true);
    expect(dropoffHoldsForOperations("handed_over")).toBe(false);
  });
});
