import type { Bay, BayZone, Vehicle, VehicleStatus } from "@/types/yard";

export function zoneOfBay(bayId: string, bays: Bay[]): BayZone {
  return bays.find(b => b.id === bayId)?.zone ?? "Parking";
}

export function statusForZone(zone: BayZone, current: VehicleStatus): VehicleStatus {
  if (current === "VOR") return "VOR";
  if (zone === "Workshop") return "In Workshop";
  if (zone === "Departure Line") return "On Departure Line";
  if (zone === "Off-site") return "Off-site";
  if (zone === "Wash" || zone === "Fuel" || zone === "Inspection") return "Awaiting Check";
  return "Available";
}

export function applyVehicleMove(
  vehicles: Vehicle[],
  vehicleId: string,
  toBayId: string,
  bays: Bay[],
): Vehicle[] {
  const zone = zoneOfBay(toBayId, bays);
  return vehicles.map(v => {
    if (v.id !== vehicleId) return v;
    return { ...v, bayId: toBayId, status: statusForZone(zone, v.status) };
  });
}
