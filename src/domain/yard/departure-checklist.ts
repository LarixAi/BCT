import { computeReadiness } from "@/lib/readiness";
import type { Driver, Trip, Vehicle } from "@/types/yard";
import type { VehicleEquipment } from "@/types/equipment";

export interface DepartureChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export function buildDepartureChecklist(
  trip: Trip,
  vehicle: Vehicle | undefined,
  driver: Driver | undefined,
  equipment: VehicleEquipment | undefined,
): DepartureChecklistItem[] {
  const items: DepartureChecklistItem[] = [];

  items.push({
    id: "driver",
    label: "Driver assigned",
    passed: !!trip.driverId && !!driver,
    detail: driver ? driver.name : "No driver linked to trip",
  });

  if (driver) {
    items.push({
      id: "driver-compliant",
      label: "Driver compliant",
      passed: driver.compliant,
      detail: driver.compliant ? "Licence and compliance OK" : "Driver compliance issue — resolve before release",
    });
  }

  items.push({
    id: "vehicle-staged",
    label: "Vehicle on departure line",
    passed: !!vehicle && vehicle.status === "On Departure Line",
    detail: vehicle ? `${vehicle.reg} at ${vehicle.bayId}` : "No vehicle assigned",
  });

  if (vehicle) {
    items.push({
      id: "yard-check",
      label: "Yard check passed",
      passed: vehicle.lastCheckPassed === true,
      detail: vehicle.lastCheckPassed ? "Latest check passed" : "Check missing or failed",
    });

    items.push({
      id: "fuel",
      label: "Fuel adequate",
      passed: vehicle.fuelPct == null ? true : vehicle.fuelPct >= 25,
      detail: vehicle.fuelPct == null ? "Fuel level not reported" : `${vehicle.fuelPct}% fuel`,
    });

    items.push({
      id: "vor",
      label: "No VOR hold",
      passed: vehicle.status !== "VOR",
      detail: vehicle.status === "VOR" ? "Vehicle is VOR" : "Clear for departure",
    });

    const readiness = computeReadiness(vehicle, equipment);
    items.push({
      id: "equipment",
      label: "Equipment departure-ready",
      passed: readiness.state === "ready" || readiness.state === "warning",
      detail: readiness.summary,
    });
  }

  return items;
}

export function checklistAllPassed(items: DepartureChecklistItem[]): boolean {
  return items.length > 0 && items.every(i => i.passed);
}

export function canReleaseTrip(trip: Trip, items: DepartureChecklistItem[]): boolean {
  return trip.ready && !trip.releasedAt && checklistAllPassed(items);
}
