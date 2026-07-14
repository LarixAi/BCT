import { describe, expect, it } from "vitest";
import { resolveStartupRoute } from "./resolve-startup-route";
import type { SessionState } from "@/types/auth";

const baseSession: SessionState = {
  status: "anonymous",
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  mfaVerified: false,
  biometricEnabled: false,
  pinEnabled: false,
  trustedDevice: false,
  hasSeenWelcome: false,
  bootstrapComplete: false,
  biometricUnlockedThisSession: false,
};

const authedSession: SessionState = {
  ...baseSession,
  status: "authenticated",
  accessToken: "token",
  refreshToken: "refresh",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: "u1", email: "a@b.com", firstName: "A", lastName: "B" },
  mfaVerified: true,
  hasSeenWelcome: true,
  bootstrapComplete: true,
};

describe("resolveStartupRoute", () => {
  it("sends new users to welcome", () => {
    expect(resolveStartupRoute({
      session: baseSession,
      tenancy: { companyId: null, companyName: null, depotId: null, depotName: null, depotCode: null, role: null },
    })).toBe("/welcome/1");
  });

  it("sends returning anonymous users to sign-in", () => {
    expect(resolveStartupRoute({
      session: { ...baseSession, hasSeenWelcome: true },
      tenancy: { companyId: null, companyName: null, depotId: null, depotName: null, depotCode: null, role: null },
    })).toBe("/sign-in");
  });

  it("requires MFA after sign-in", () => {
    expect(resolveStartupRoute({
      session: {
        ...authedSession,
        mfaVerified: false,
        bootstrapComplete: false,
      },
      tenancy: { companyId: null, companyName: null, depotId: null, depotName: null, depotCode: null, role: null },
    })).toBe("/mfa");
  });

  it("requires company selection", () => {
    expect(resolveStartupRoute({
      session: { ...authedSession, mfaVerified: true, bootstrapComplete: false },
      tenancy: { companyId: null, companyName: null, depotId: null, depotName: null, depotCode: null, role: null },
    })).toBe("/company-select");
  });

  it("requires depot selection", () => {
    expect(resolveStartupRoute({
      session: { ...authedSession, mfaVerified: true, bootstrapComplete: false },
      tenancy: { companyId: "co1", companyName: "Co", depotId: null, depotName: null, depotCode: null, role: "yard_manager" },
    })).toBe("/depot-select");
  });

  it("requires initial sync", () => {
    expect(resolveStartupRoute({
      session: { ...authedSession, mfaVerified: true, bootstrapComplete: false },
      tenancy: { companyId: "co1", companyName: "Co", depotId: "d1", depotName: "Depot", depotCode: "B3", role: "yard_manager" },
    })).toBe("/initial-sync");
  });

  it("lands on home when fully ready", () => {
    expect(resolveStartupRoute({
      session: authedSession,
      tenancy: { companyId: "co1", companyName: "Co", depotId: "d1", depotName: "Depot", depotCode: "B3", role: "yard_manager" },
    })).toBe("/");
  });

  it("routes suspended accounts to restricted screen", () => {
    expect(resolveStartupRoute({
      session: { ...baseSession, status: "suspended" },
      tenancy: { companyId: null, companyName: null, depotId: null, depotName: null, depotCode: null, role: null },
      mandatoryUpdateRequired: false,
    })).toBe("/account-restricted");
  });
});
