import type { DamageObservation } from "@/types/condition";
import type { Vehicle } from "@/types/yard";

export type DriverBodyworkReportRow = DamageObservation & {
  photoDataUrl?: string;
  defectRef?: string;
};

export function isDriverBodyworkReport(obs: DamageObservation): boolean {
  return obs.reportSource === "driver_report";
}

export function driverBodyworkReports(
  observations: DamageObservation[],
): DriverBodyworkReportRow[] {
  return observations
    .filter(isDriverBodyworkReport)
    .filter(o => !["repaired", "existing_unchanged"].includes(o.classification))
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

export function resolveDriverReportVehicle(
  report: DriverBodyworkReportRow,
  vehicles: Vehicle[],
): Vehicle | undefined {
  return vehicles.find(v => v.id === report.vehicleId);
}
