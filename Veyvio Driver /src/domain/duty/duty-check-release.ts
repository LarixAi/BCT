import type { DutyDetail } from "@/types/duty";
import { getVehicleReadiness } from "@/data/mocks/duties";

/** True when this duty's vehicle is released for service (duty stamp or readiness map). */
export function dutyVehicleCheckCleared(duty: DutyDetail): boolean {
  if (duty.vehicleCheck.status === "cleared" && duty.vehicleCheck.canStartDuty) return true;
  const vehicleId = duty.vehicle?.id ?? duty.vehicleCheck.vehicleId;
  if (!vehicleId) return false;
  const readiness = getVehicleReadiness(vehicleId);
  return readiness?.status === "released" && readiness.vehicleId === vehicleId;
}
