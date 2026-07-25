import { describe, expect, it } from "vitest";
import {
  driverWorkspaceStorageKey,
  parseDriverWorkspaceStorageKey,
  resolveDriverWorkspaceScope,
} from "@/lib/driver-workspace-storage";

describe("driver-workspace-storage", () => {
  it("scopes storage keys by company and membership", () => {
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
        { id: "drv-1", organisation_id: "co-driver" },
        { activeCompanyId: "co-session", membershipId: "mem-session" },
      ),
    ).toEqual({ companyId: "co-session", membershipId: "mem-session" });
  });

  it("falls back to driver org when session company is absent", () => {
    expect(resolveDriverWorkspaceScope({ id: "drv-9", organisation_id: "co-driver" }, null)).toEqual({
      companyId: "co-driver",
      membershipId: "drv-9",
    });
  });
});
