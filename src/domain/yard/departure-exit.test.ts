import { describe, expect, it } from "vitest";
import * as fx from "@/data/fixtures";
import { applyVehicleDeparture, canConfirmYardDeparture } from "@/domain/yard/departure-exit";
import { buildBayOccupancy } from "@/features/yard/yard-map";

describe("departure-exit", () => {
  it("frees the departure bay and marks the vehicle off-site", () => {
    const trip = fx.trips[0];
    const vehicle = fx.vehicles.find(v => v.id === trip.vehicleId)!;
    const staged = { ...vehicle, bayId: "D01", status: "On Departure Line" as const };
    const fleet = fx.vehicles.map(v => (v.id === staged.id ? staged : v));

    const result = applyVehicleDeparture({
      trip: { ...trip, releasedAt: new Date().toISOString(), releasedBy: "J. Miller" },
      vehicle: staged,
      vehicles: fleet,
      bays: fx.bays,
      at: "2026-07-16T06:15:00.000Z",
      by: "J. Miller",
      source: "yard_confirmed",
      movementId: "m_test",
    });

    expect(result).not.toBeNull();
    expect(result!.fromBayId).toBe("D01");
    expect(result!.movement.reason).toBe("Departed for service");
    expect(result!.trip.departedAt).toBe("2026-07-16T06:15:00.000Z");

    const departedVehicle = result!.vehicles.find(v => v.id === staged.id)!;
    expect(departedVehicle.status).toBe("Off-site");

    const occupancy = buildBayOccupancy(fx.bays, result!.vehicles);
    expect(occupancy.find(cell => cell.bay.id === "D01")?.vehicle).toBeNull();
  });

  it("is idempotent when already departed", () => {
    const trip = { ...fx.trips[0], departedAt: "2026-07-16T06:00:00.000Z" };
    const vehicle = fx.vehicles.find(v => v.id === trip.vehicleId)!;
    const result = applyVehicleDeparture({
      trip,
      vehicle: { ...vehicle, status: "Off-site" },
      vehicles: fx.vehicles,
      bays: fx.bays,
      at: "2026-07-16T06:15:00.000Z",
      by: "J. Miller",
      source: "yard_confirmed",
      movementId: "m_test",
    });
    expect(result).toBeNull();
  });

  it("allows Yard confirm after release", () => {
    const trip = { ...fx.trips[0], releasedAt: "2026-07-16T06:10:00.000Z" };
    const vehicle = fx.vehicles.find(v => v.id === trip.vehicleId)!;
    expect(canConfirmYardDeparture(trip, vehicle)).toBe(true);
    expect(canConfirmYardDeparture({ ...trip, departedAt: "2026-07-16T06:15:00.000Z" }, vehicle)).toBe(false);
  });
});
