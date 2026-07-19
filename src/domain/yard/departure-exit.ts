import type { Bay, Movement, Trip, Vehicle } from "@/types/yard";
import { applyVehicleMove } from "@/domain/yard/bay-zones";

export type DepartureSource = "driver_journey_start" | "yard_confirmed";

export interface DepartVehicleInput {
  trip: Trip;
  vehicle: Vehicle;
  vehicles: Vehicle[];
  bays: Bay[];
  at: string;
  by: string;
  source: DepartureSource;
  movementId: string;
}

export interface DepartVehicleResult {
  vehicles: Vehicle[];
  trip: Trip;
  movement: Movement;
  fromBayId: string;
}

/** Pure domain transition: vehicle leaves for service and frees its physical bay. */
export function applyVehicleDeparture(input: DepartVehicleInput): DepartVehicleResult | null {
  const { trip, vehicle, vehicles, bays, at, by, source, movementId } = input;
  if (trip.departedAt || vehicle.status === "Off-site") return null;

  const offSiteBay = bays.find(bay => bay.zone === "Off-site");
  if (!offSiteBay) return null;

  const fromBayId = vehicle.bayId;
  const nextVehicles = applyVehicleMove(vehicles, vehicle.id, offSiteBay.id, bays);

  const movement: Movement = {
    id: movementId,
    vehicleId: vehicle.id,
    fromBayId,
    toBayId: offSiteBay.id,
    reason: "Departed for service",
    at,
    by,
    note: source === "driver_journey_start" ? "Journey started by driver" : "Departure confirmed by Yard",
  };

  return {
    vehicles: nextVehicles,
    trip: {
      ...trip,
      departedAt: at,
      departedBy: by,
      departureSource: source,
    },
    movement,
    fromBayId,
  };
}

export function canConfirmYardDeparture(trip: Trip, vehicle?: Vehicle): boolean {
  if (!trip.vehicleId || trip.departedAt || !vehicle) return false;
  if (vehicle.status === "Off-site") return false;
  return !!trip.releasedAt || trip.ready;
}
