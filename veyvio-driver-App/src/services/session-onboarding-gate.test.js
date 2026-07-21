import { describe, expect, it } from "vitest";
import { mapAccountStatusToDriverFields } from "@/services/session.service";
import { normalizeOnboardingStatus } from "@/lib/onboarding-status";
import { resolveDriverAccessMode } from "@/lib/driver-access-mode";

describe("mapAccountStatusToDriverFields", () => {
  it("keeps invited / pending invite drivers in onboarding", () => {
    for (const status of ["invitation_pending", "invitation_sent", "draft"]) {
      const fields = mapAccountStatusToDriverFields(status);
      expect(normalizeOnboardingStatus(fields.onboarding_status)).toBe("invited");
    }
  });

  it("routes setup_incomplete into onboarding (not the ops shell)", () => {
    const fields = mapAccountStatusToDriverFields("setup_incomplete");
    expect(normalizeOnboardingStatus(fields.onboarding_status)).toBe("in_progress");
    expect(
      resolveDriverAccessMode({
        signedIn: true,
        driverProfileLinked: true,
        driver: { onboardingStatus: fields.onboarding_status, status: fields.status },
        driverRow: fields,
      }),
    ).toBe("onboarding");
  });

  it("shows pending approval for pending_approval accounts", () => {
    const fields = mapAccountStatusToDriverFields("pending_approval");
    expect(normalizeOnboardingStatus(fields.onboarding_status)).toBe("submitted");
    expect(
      resolveDriverAccessMode({
        signedIn: true,
        driverProfileLinked: true,
        driver: { onboardingStatus: fields.onboarding_status, status: fields.status },
        driverRow: fields,
      }),
    ).toBe("pending");
  });

  it("opens the app only when Command marks the account active", () => {
    const fields = mapAccountStatusToDriverFields("active");
    expect(fields.onboarding_status).toBe("active");
    expect(
      resolveDriverAccessMode({
        signedIn: true,
        driverProfileLinked: true,
        driver: { onboardingStatus: fields.onboarding_status, status: fields.status },
        driverRow: fields,
      }),
    ).toBe("app");
  });
});
