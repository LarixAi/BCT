import { describe, expect, it } from "vitest";
import { getYardApi, isMockApi } from "@/platform/api";
import { mockYardApi } from "@/platform/api/mock-yard-api";
import { hydrateYardFromApi, applyBootstrapToYard } from "@/platform/yard/hydrate-yard-store";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import { useYard } from "@/store/yard";
import { usesCommandYardApi } from "@/platform/api/config";

describe("yard API hydrate", () => {
  it("exposes mock vs Command mode from env", () => {
    expect(typeof isMockApi()).toBe("boolean");
    expect(typeof usesCommandYardApi()).toBe("boolean");
  });

  it("mock adapter hydrates the store (fixtures)", async () => {
    usePermissionStore.getState().reset();
    const health = await mockYardApi.healthCheck();
    expect(health.ok).toBe(true);

    const payload = await mockYardApi.fetchBootstrap("co_northwest", "dep_b3", "yard_manager");
    applyBootstrapToYard(payload);

    expect(useYard.getState().operationalPlan).not.toBeNull();
    expect(useYard.getState().vehicles.length).toBeGreaterThan(0);
    expect(usePermissionStore.getState().can("plan.view")).toBe(true);
  });

  it("hydrateYardFromApi uses getYardApi()", async () => {
    usePermissionStore.getState().reset();
    const api = getYardApi();
    expect(api).toBeTruthy();

    if (isMockApi()) {
      const result = await hydrateYardFromApi({
        companyId: "co_northwest",
        depotId: "dep_b3",
        role: "yard_manager",
      });
      expect(result.refreshed).toBe(true);
      expect(useYard.getState().vehicles.length).toBeGreaterThan(0);
    } else {
      // Live Command mode needs a real Bearer — skip full hydrate here
      const health = await api.healthCheck();
      expect(typeof health.ok).toBe("boolean");
    }
  });
});
