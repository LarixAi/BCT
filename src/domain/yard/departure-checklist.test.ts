import { describe, expect, it } from "vitest";
import * as fx from "@/data/fixtures";
import { initialVehicleEquipment } from "@/data/equipment-fixtures";
import { buildDepartureChecklist, canReleaseTrip, checklistAllPassed } from "@/domain/yard/departure-checklist";

describe("departure-checklist", () => {
  it("passes all items for a ready staged trip", () => {
    const trip = fx.trips.find(t => t.id === "t1")!;
    const vehicle = fx.vehicles.find(v => v.id === trip.vehicleId);
    const driver = fx.drivers.find(d => d.id === trip.driverId);
    const eq = vehicle ? initialVehicleEquipment[vehicle.id] : undefined;
    const items = buildDepartureChecklist(trip, vehicle, driver, eq);
    expect(checklistAllPassed(items)).toBe(true);
    expect(canReleaseTrip({ ...trip, ready: true }, items)).toBe(true);
  });

  it("fails when driver is missing", () => {
    const trip = fx.trips.find(t => t.id === "t2")!;
    const vehicle = fx.vehicles.find(v => v.id === trip.vehicleId);
    const items = buildDepartureChecklist(trip, vehicle, undefined, undefined);
    expect(items.find(i => i.id === "driver")?.passed).toBe(false);
    expect(canReleaseTrip(trip, items)).toBe(false);
  });
});
