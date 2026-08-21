import { describe, expect, it } from "vitest";
import { getActiveDutyVehicleSummary, validateVehicleSelection } from "@/lib/vehicle-swap-gate";

const bootstrap = {
  duties: [
    {
      id: "duty-1",
      lifecycleStatus: "in_progress",
      actualSignOnAt: "2026-07-25T06:00:00.000Z",
      vehicle: { id: "veh-a", registrationNumber: "BX62 BCT" },
      routeName: "AM School",
    },
  ],
};

describe("vehicle-swap-gate", () => {
  it("allows selection before sign-on", () => {
    const result = validateVehicleSelection({ duties: [{ id: "d1", vehicle: { id: "veh-b" } }] }, "veh-b");
    expect(result.ok).toBe(true);
  });

  it("allows the active duty vehicle while signed on", () => {
    expect(validateVehicleSelection(bootstrap, "veh-a").ok).toBe(true);
  });

  it("blocks a different vehicle while signed on", () => {
    const result = validateVehicleSelection(bootstrap, "veh-b");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("mid_duty_vehicle_swap_blocked");
    expect(result.message).toMatch(/BX62 BCT/);
  });

  it("summarises the active duty vehicle", () => {
    expect(getActiveDutyVehicleSummary(bootstrap)).toMatchObject({
      vehicleId: "veh-a",
      registration: "BX62 BCT",
    });
  });
});
