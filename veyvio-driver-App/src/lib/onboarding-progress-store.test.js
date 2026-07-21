import { describe, expect, it } from "vitest";
import { applyOnboardingStepCompletions } from "./onboarding-progress-store.js";

describe("applyOnboardingStepCompletions", () => {
  const steps = [
    { stepKey: "personal_profile", status: "pending", reviewStatus: null },
    { stepKey: "emergency_contact", status: "pending", reviewStatus: null },
  ];

  it("marks personal_profile complete from phone inference", () => {
    const next = applyOnboardingStepCompletions(steps, {
      inferPersonalFromPhone: true,
      phone: "07700900000",
    });
    expect(next[0].status).toBe("submitted");
    expect(next[0].reviewStatus).toBeNull();
    expect(next[1].status).toBe("pending");
  });

  it("merges local completed keys without forcing pending review", () => {
    const next = applyOnboardingStepCompletions(steps, {
      completedStepKeys: ["personal_profile", "emergency_contact"],
    });
    expect(next.every((s) => s.status === "submitted")).toBe(true);
    expect(next.every((s) => s.reviewStatus == null)).toBe(true);
  });

  it("leaves steps alone when nothing completed", () => {
    const next = applyOnboardingStepCompletions(steps, { phone: "" });
    expect(next).toEqual(steps);
  });
});
