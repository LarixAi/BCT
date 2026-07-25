import { describe, expect, it } from "vitest";
import { canSignOnForDuty, getDutySignOnBlockers } from "@/lib/driver-sign-on-gate";

describe("driver-sign-on-gate", () => {
  it("blocks when bootstrap eligibility is not allowed", () => {
    const blockers = getDutySignOnBlockers({
      duty: { vehicleCheck: { canStartDuty: true, status: "complete" } },
      bootstrap: {
        eligibility: {
          allowed: false,
          blockers: ["Driving licence expired"],
        },
      },
    });
    expect(blockers).toContain("Driving licence expired");
    expect(canSignOnForDuty({ duty: {}, bootstrap: { eligibility: { allowed: false, blockers: ["x"] } } })).toBe(
      false,
    );
  });

  it("blocks when vehicle check is incomplete", () => {
    const blockers = getDutySignOnBlockers({
      bootstrap: { eligibility: { allowed: true, blockers: [] } },
      duty: { vehicleCheck: { canStartDuty: false, status: "not_started" } },
    });
    expect(blockers[0]).toMatch(/vehicle check/i);
  });
});
