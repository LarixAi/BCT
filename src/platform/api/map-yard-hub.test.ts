import { describe, expect, it } from "vitest";
import { mapYardHubToBootstrap } from "@/platform/api/map-yard-hub";
import type { YardHubResponse } from "@/platform/auth/command-auth-api";

describe("mapYardHubToBootstrap", () => {
  it("maps hub vehicles onto bootstrap and keeps fixture domains", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "North Bolton",
      shiftLabel: "Day shift",
      vehicles: [
        {
          vehicleId: "veh_1",
          registrationNumber: "AB12 CDE",
          vehicleCategory: "minibus",
          zone: "Yard",
          readinessState: "ready_for_service",
        },
        {
          vehicleId: "veh_2",
          registrationNumber: "XY99 ZZZ",
          vehicleCategory: "coach",
          zone: "Workshop",
          readinessState: "vor",
          exceptionLabels: ["VOR"],
        },
      ],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.companyId).toBe("co_live");
    expect(payload.depotId).toBe("dep_live");
    expect(payload.vehicles).toHaveLength(2);
    expect(payload.vehicles[0].reg).toBe("AB12 CDE");
    expect(payload.vehicles[0].status).toBe("Available");
    expect(payload.vehicles[0].fuelPct).toBeUndefined();
    expect(payload.vehicles[1].status).toBe("VOR");
    expect(payload.tasks).toEqual([]);
    expect(payload.bays.length).toBeGreaterThan(0);
  });
});
