import { describe, expect, it } from "vitest";
import {
  assertDriverTenantContextReady,
  normalizeDriverTenantFields,
  resolveCompanyAutoActivationPolicy,
} from "@/lib/driver-tenant-context";

describe("resolveCompanyAutoActivationPolicy", () => {
  it("activates only when exactly one membership company exists", () => {
    expect(resolveCompanyAutoActivationPolicy(["co-a"])).toEqual({
      action: "activate",
      companyId: "co-a",
    });
  });

  it("never silently picks among multiple companies", () => {
    expect(resolveCompanyAutoActivationPolicy(["co-a", "co-b"])).toEqual({
      action: "require_selection",
      companyIds: ["co-a", "co-b"],
    });
  });

  it("does nothing when membership list is empty", () => {
    expect(resolveCompanyAutoActivationPolicy([])).toEqual({ action: "none" });
    expect(resolveCompanyAutoActivationPolicy([null, ""])).toEqual({ action: "none" });
  });

  it("dedupes identical company ids before deciding", () => {
    expect(resolveCompanyAutoActivationPolicy(["co-a", "co-a", " co-a "])).toEqual({
      action: "activate",
      companyId: "co-a",
    });
  });
});

describe("normalizeDriverTenantFields", () => {
  it("aliases company fields onto one authoritative id", () => {
    expect(
      normalizeDriverTenantFields({
        organisationId: "co-org",
        membershipId: "mem-1",
      }),
    ).toEqual({
      companyId: "co-org",
      activeCompanyId: "co-org",
      organisationId: "co-org",
      membershipId: "mem-1",
    });
  });

  it("rejects membership ids that are actually user, driver, or company ids", () => {
    expect(
      normalizeDriverTenantFields({
        companyId: "co-a",
        membershipId: "user-1",
        userId: "user-1",
      }).membershipId,
    ).toBeNull();
    expect(
      normalizeDriverTenantFields({
        companyId: "co-a",
        membershipId: "drv-1",
        driverId: "drv-1",
      }).membershipId,
    ).toBeNull();
    expect(
      normalizeDriverTenantFields({
        companyId: "co-a",
        membershipId: "co-a",
      }).membershipId,
    ).toBeNull();
  });
});

describe("assertDriverTenantContextReady", () => {
  it("fails closed without company or membership", () => {
    expect(assertDriverTenantContextReady({ membershipId: "mem-1" }).ok).toBe(false);
    expect(assertDriverTenantContextReady({ companyId: "co-a" }).ok).toBe(false);
  });

  it("passes only with real company + membership", () => {
    expect(
      assertDriverTenantContextReady({
        companyId: "co-a",
        membershipId: "mem-1",
        userId: "user-1",
      }),
    ).toEqual({
      ok: true,
      tenant: {
        companyId: "co-a",
        activeCompanyId: "co-a",
        organisationId: "co-a",
        membershipId: "mem-1",
      },
    });
  });
});
