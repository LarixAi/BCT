import { describe, expect, it } from "vitest";
import { buildAccessContext, resolveDriverAccessMode } from "@/lib/driver-access-mode";

describe("resolveDriverAccessMode — post-auth gates", () => {
  it("does not recycle the password screen when signed in but not a driver", () => {
    expect(
      resolveDriverAccessMode({
        signedIn: true,
        isDriverMember: false,
        driverProfileLinked: false,
        driver: null,
      }),
    ).toBe("unlinked");
  });

  it("sends incomplete drivers to onboarding, not login", () => {
    expect(
      resolveDriverAccessMode({
        signedIn: true,
        isDriverMember: true,
        driverProfileLinked: true,
        driver: { onboardingStatus: "documents_pending", status: "pending" },
        driverRow: { onboarding_status: "documents_pending", status: "pending" },
      }),
    ).toBe("onboarding");
  });

  it("opens the ops shell when Command has activated for dispatch", () => {
    expect(
      resolveDriverAccessMode({
        signedIn: true,
        isDriverMember: true,
        driverProfileLinked: true,
        driver: { onboardingStatus: "documents_pending", status: "pending" },
        driverRow: { onboarding_status: "documents_pending", status: "pending" },
        operationalStatus: "eligible",
      }),
    ).toBe("app");
  });
});

describe("buildAccessContext", () => {
  it("maps session_error to the unlinked recovery screen", () => {
    const access = buildAccessContext(
      { userId: "u1", routeTarget: "session_error", linkError: "timed out" },
      null,
    );
    expect(access.mode).toBe("unlinked");
  });

  it("maps not_driver to unlinked", () => {
    const access = buildAccessContext(
      { userId: "u1", routeTarget: "not_driver", linkError: "not a driver" },
      null,
    );
    expect(access.mode).toBe("unlinked");
  });
});
