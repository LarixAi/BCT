import { describe, expect, it } from "vitest";
import { driverSubmissionToHubInput } from "./admin-bridge";
import { validateDriverSubmission } from "./validation";
import type { DriverIncidentSubmission } from "./types";

function baseSubmission(overrides: Partial<DriverIncidentSubmission> = {}): DriverIncidentSubmission {
  const now = new Date().toISOString();
  return {
    localIncidentId: "inc_local_test",
    idempotencyKey: "inc_local_test",
    categoryCode: "road_collision",
    severity: "high",
    stage: "draft",
    schemaVersion: 2,
    formDefinitionVersion: 1,
    driverAppVersion: "0.1.0",
    reportingChannel: "driver_app",
    reportedAt: now,
    reporter: { userId: "u1", name: "James Cole", role: "driver", driverId: "d1" },
    operationalContext: { vehicleRegistration: "VX21 ABC", runReference: "RUN-2841" },
    contextConfirmed: true,
    summary: "Rear contact at junction",
    immediateDanger: { value: "no", source: "DRIVER", enteredAt: now },
    answers: {
      injuryReported: { value: "not_yet_confirmed", source: "DRIVER", enteredAt: now },
      journeyCanContinue: { value: "no", source: "DRIVER", enteredAt: now },
    },
    peopleInvolved: [],
    immediateActions: [],
    evidence: [],
    confidentialityLevel: "standard",
    ...overrides,
  };
}

describe("driverSubmissionToHubInput", () => {
  it("maps driver payload to admin hub input with metadata", () => {
    const hub = driverSubmissionToHubInput(baseSubmission());
    expect(hub.reportingSource).toBe("driver_app");
    expect(hub.category).toBe("road_collision");
    expect(hub.driverReportMetadata?.completenessScore).toBeGreaterThan(0);
    expect(hub.driverReportMetadata?.originalAnswers.injuryReported?.value).toBe("not_yet_confirmed");
  });
});

describe("validateDriverSubmission", () => {
  it("allows initial submit without police reference", () => {
    const issues = validateDriverSubmission(baseSubmission(), "initial");
    expect(issues.some((issue) => issue.fieldKey === "policeReference")).toBe(false);
  });
});
