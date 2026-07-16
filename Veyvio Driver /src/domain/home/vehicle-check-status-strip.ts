import type { DriverHomeSummary } from "@/types/home";

/**
 * Show the global orange status strip until the assigned vehicle check is done.
 * Passed / not-required always wins over a stale operationalState.
 */
export function shouldShowVehicleCheckRequiredStrip(summary: DriverHomeSummary): boolean {
  const check = summary.vehicleAssignment?.checkStatus;
  if (check === "passed" || check === "not_required") return false;
  if (check === "required" || check === "in_progress") return true;
  return summary.operationalState === "vehicle_check_required";
}
