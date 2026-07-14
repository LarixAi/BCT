import { computeReadiness } from "@/lib/readiness";
import type { Trip, Vehicle } from "@/types/yard";
import type { VehicleEquipment } from "@/types/equipment";

export function recomputeTrip(
  trip: Trip,
  vehicles: Vehicle[],
  equipment: Record<string, VehicleEquipment>,
): Trip {
  const blockers: Trip["blockers"] = [];
  if (!trip.driverId) blockers.push("No driver");
  const vehicle = trip.vehicleId ? vehicles.find(v => v.id === trip.vehicleId) : undefined;
  if (!vehicle) {
    blockers.push("Not on departure line");
  } else {
    if (vehicle.status === "VOR") blockers.push("VOR");
    else if (vehicle.status === "In Workshop") blockers.push("Vehicle in workshop");
    else if (vehicle.status !== "On Departure Line") blockers.push("Not on departure line");
    if (vehicle.fuelPct < 25) blockers.push("Fuel low");
    if (!vehicle.lastCheckPassed) blockers.push("Check missing");
    const readiness = computeReadiness(vehicle, equipment[vehicle.id]);
    if (readiness.state === "blocked") blockers.push("Equipment non-compliant");
    else if (readiness.state === "restricted") blockers.push("Equipment restricted");
  }
  return { ...trip, blockers, ready: blockers.length === 0 };
}

export function recomputeAllTrips(
  trips: Trip[],
  vehicles: Vehicle[],
  equipment: Record<string, VehicleEquipment>,
): Trip[] {
  return trips.map(t => recomputeTrip(t, vehicles, equipment));
}
