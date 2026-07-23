import { describe, expect, it } from "vitest";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";

describe("buildBootstrapPayload", () => {
  it("scopes bootstrap data to company and depot", () => {
    const payload = buildBootstrapPayload("co_northwest", "dep_b3", "yard_manager");
    expect(payload.companyId).toBe("co_northwest");
    expect(payload.depotId).toBe("dep_b3");
    expect(payload.vehicles.length).toBeGreaterThan(0);
    expect(payload.permissions).toContain("vehicle.mark_vor");
    expect(payload.permissions).toContain("plan.view");
    expect(payload.tasks.length).toBeGreaterThan(0);
    expect(payload.operationalPlan?.staging.length).toBeGreaterThan(0);
    expect(payload.schemaVersion).toBeGreaterThanOrEqual(6);
  });
});
