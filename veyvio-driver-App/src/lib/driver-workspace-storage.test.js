import { describe, expect, it } from "vitest";
import {
  OfflineContextError,
  driverWorkspaceStorageKey,
  parseDriverWorkspaceStorageKey,
  requireDriverWorkspaceScope,
  requireWorkspaceIds,
  resolveDriverWorkspaceScope,
} from "@/lib/driver-workspace-storage";

describe("driver-workspace-storage", () => {
  it("scopes storage keys by company and membership using production code", () => {
    expect(driverWorkspaceStorageKey("co-a", "mem-1", "ops-command-outbox")).toBe(
      "driver:co-a:mem-1:ops-command-outbox",
    );
  });

  it("parses scoped keys back to workspace parts", () => {
    expect(parseDriverWorkspaceStorageKey("driver:co-a:mem-1:fleet-ping-queue")).toEqual({
      companyId: "co-a",
      membershipId: "mem-1",
      suffix: "fleet-ping-queue",
    });
  });

  it("resolves company from session before driver fallback", () => {
    expect(
      resolveDriverWorkspaceScope(
        { id: "drv-1", organisation_id: "co-driver", user_id: "user-1" },
        { activeCompanyId: "co-session", membershipId: "mem-session" },
      ),
    ).toEqual({ companyId: "co-session", membershipId: "mem-session" });
  });

  it("does not fall back to driver.id as membership", () => {
    expect(resolveDriverWorkspaceScope({ id: "drv-9", organisation_id: "co-driver" }, null)).toEqual({
      companyId: "co-driver",
      membershipId: null,
    });
    expect(() => requireDriverWorkspaceScope({ id: "drv-9", organisation_id: "co-driver" }, null)).toThrow(
      OfflineContextError,
    );
  });

  it("rejects malformed tenant context instead of building an unscoped key", () => {
    expect(() => driverWorkspaceStorageKey("", "mem-1", "ops")).toThrow(OfflineContextError);
    expect(() => requireWorkspaceIds("co-a", null)).toThrow(OfflineContextError);
  });

  it("never treats userId as membershipId", () => {
    expect(
      resolveDriverWorkspaceScope(
        { id: "drv-1", organisation_id: "co-a", user_id: "user-1" },
        { activeCompanyId: "co-a", userId: "user-1", membershipId: null },
      ),
    ).toEqual({ companyId: "co-a", membershipId: null });
  });

  it("uses Command membership_id rather than a user-id fallback", () => {
    expect(
      requireDriverWorkspaceScope(
        { id: "drv-1", organisation_id: "co-a", membership_id: "mem-real" },
        { companyId: "co-a", membershipId: "mem-real" },
      ),
    ).toEqual({ companyId: "co-a", membershipId: "mem-real" });
  });

  it("resolves company from session.organisationId when activeCompanyId is absent", () => {
    expect(
      resolveDriverWorkspaceScope(
        { id: "drv-1", organisation_id: "co-driver" },
        { organisationId: "co-session", membershipId: "mem-session" },
      ),
    ).toEqual({ companyId: "co-session", membershipId: "mem-session" });
  });
});
