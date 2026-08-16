import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForRoles } from "./has-permission";

describe("hasPermission", () => {
  it("allows yard managers to run spot audits", () => {
    expect(hasPermission("yard_manager", "check.spot_audit")).toBe(true);
    expect(hasPermission("yard_operative", "check.spot_audit")).toBe(false);
  });

  it("allows yard managers to mark VOR", () => {
    expect(hasPermission("yard_manager", "vehicle.mark_vor")).toBe(true);
  });

  it("denies operatives from releasing VOR", () => {
    expect(hasPermission("yard_operative", "vehicle.release_vor")).toBe(false);
  });

  it("denies unknown roles", () => {
    expect(hasPermission(null, "vehicle.view")).toBe(false);
  });

  it("unions multi-role grants order-independently", () => {
    const forward = permissionsForRoles(["read_only_auditor", "yard_operative"]);
    const reverse = permissionsForRoles(["yard_operative", "read_only_auditor"]);
    expect(forward.sort()).toEqual(reverse.sort());
    expect(hasPermission(["read_only_auditor", "yard_operative"], "vehicle.move")).toBe(true);
    expect(hasPermission(["yard_operative", "read_only_auditor"], "vehicle.move")).toBe(true);
    expect(hasPermission(["read_only_auditor", "yard_operative"], "vehicle.mark_vor")).toBe(false);
  });
});
