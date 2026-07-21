import { describe, expect, it } from "vitest";
import { mergeOnboardingFormFromPrefill } from "./onboarding-form-merge.js";

describe("mergeOnboardingFormFromPrefill", () => {
  it("keeps typed values when prefill returns empty strings", () => {
    const merged = mergeOnboardingFormFromPrefill(
      { dqcNumber: "LAING904265LL9TX", cpcExpiry: "2027-07-17" },
      { dqcNumber: "", cpcExpiry: "", phone: "07375149120" },
    );
    expect(merged.dqcNumber).toBe("LAING904265LL9TX");
    expect(merged.cpcExpiry).toBe("2027-07-17");
    expect(merged.phone).toBe("07375149120");
  });

  it("applies server values when local field is empty", () => {
    const merged = mergeOnboardingFormFromPrefill(
      { dqcNumber: "" },
      { dqcNumber: "ONFILE123", cpcExpiry: "2027-01-01" },
    );
    expect(merged.dqcNumber).toBe("ONFILE123");
    expect(merged.cpcExpiry).toBe("2027-01-01");
  });
});
