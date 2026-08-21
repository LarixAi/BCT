import type { VehicleEquipment } from "@/types/equipment";

export function isValidVehicleEquipment(eq: VehicleEquipment | undefined): eq is VehicleEquipment {
  return (
    !!eq &&
    Array.isArray(eq.fixed) &&
    Array.isArray(eq.assigned) &&
    Array.isArray(eq.consumables) &&
    Array.isArray(eq.documents)
  );
}
