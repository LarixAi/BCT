import { describe, expect, it } from "vitest";
import { driverSubmissionToHubInput, validateDriverSubmission } from "@veyvio/incidents";
import type { DriverIncidentSubmission } from "@veyvio/incidents";

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

describe("incident alignment", () => {
  it("maps driver payload to admin hub input with metadata", () => {
    const hub = driverSubmissionToHubInput(baseSubmission());
    expect(hub.reportingSource).toBe("driver_app");
    expect(hub.driverReportMetadata?.originalAnswers.injuryReported?.value).toBe("not_yet_confirmed");
  });

  it("does not block emergency submit for missing police reference", () => {
    const issues = validateDriverSubmission(baseSubmission(), "initial");
    expect(issues.some((issue) => issue.fieldKey === "policeReference")).toBe(false);
  });

  it("requires declaration fields for completion stage", () => {
    const issues = validateDriverSubmission(
      baseSubmission({
        stage: "completing",
        answers: {
          description: { value: "Full description", source: "DRIVER", enteredAt: new Date().toISOString() },
          driverStatement: { value: "Statement", source: "DRIVER", enteredAt: new Date().toISOString() },
        },
      }),
      "complete",
    );
    expect(issues.length).toBeGreaterThan(0);
  });
});
