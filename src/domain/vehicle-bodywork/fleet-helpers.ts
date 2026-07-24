import {
  getConditionProfile,
  inspectionsForVehicle,
  openDamageForVehicle,
} from "@/domain/condition/condition-helpers";
import type { DamageRecord, DamageRecordStatus, DamageSeverity, VehicleInspection } from "@/types/condition";
import type { Vehicle, VehicleStatus } from "@/types/yard";

export type FleetDamageFilter =
  | "all"
  | "damage_recorded"
  | "no_damage"
  | "new_reported"
  | "awaiting_assessment"
  | "repair_required"
  | "repair_booked"
  | "repair_in_progress"
  | "repair_completed"
  | "vor";

export type FleetSummaryFilter =
  | "vehicles_with_damage"
  | "open_reports"
  | "awaiting_assessment"
  | "repairs_in_progress";

export interface FleetBodyworkMetrics {
  vehiclesWithDamage: number;
  openReports: number;
  awaitingAssessment: number;
  repairsInProgress: number;
}

export interface VehicleBodyworkSummary {
  vehicleId: string;
  openDamageCount: number;
  knownDamageAreas: number;
  openReportCount: number;
  awaitingAssessmentCount: number;
  repairInProgressCount: number;
  lastBodyInspectionAt?: string;
  hasNoKnownDamage: boolean;
}

const OPEN_STATUSES = new Set<DamageRecordStatus>([
  "suspected",
  "awaiting_review",
  "confirmed",
  "monitoring",
  "repair_required",
  "repair_scheduled",
  "under_repair",
  "awaiting_verification",
]);

const AWAITING_ASSESSMENT_STATUSES = new Set<DamageRecordStatus>([
  "suspected",
  "awaiting_review",
]);

const REPAIR_REQUIRED_STATUSES = new Set<DamageRecordStatus>(["repair_required"]);

const REPAIR_BOOKED_STATUSES = new Set<DamageRecordStatus>(["repair_scheduled"]);

const REPAIR_IN_PROGRESS_STATUSES = new Set<DamageRecordStatus>([
  "under_repair",
  "awaiting_verification",
]);

export function isOpenDamageRecord(record: DamageRecord): boolean {
  return OPEN_STATUSES.has(record.status);
}

export function fleetBodyworkMetrics(
  vehicles: Vehicle[],
  damageRecords: DamageRecord[],
): FleetBodyworkMetrics {
  const vehicleIds = new Set(vehicles.map(v => v.id));
  const scoped = damageRecords.filter(d => vehicleIds.has(d.vehicleId) && isOpenDamageRecord(d));

  const vehiclesWithDamage = new Set(scoped.map(d => d.vehicleId)).size;
  const openReports = scoped.length;
  const awaitingAssessment = scoped.filter(d => AWAITING_ASSESSMENT_STATUSES.has(d.status)).length;
  const repairsInProgress = scoped.filter(d => REPAIR_IN_PROGRESS_STATUSES.has(d.status)).length;

  return { vehiclesWithDamage, openReports, awaitingAssessment, repairsInProgress };
}

export function summarizeVehicleBodywork(
  vehicleId: string,
  damageRecords: DamageRecord[],
  inspections: VehicleInspection[],
): VehicleBodyworkSummary {
  const vehicleDamage = damageRecords.filter(d => d.vehicleId === vehicleId);
  const openDamage = openDamageForVehicle(damageRecords, vehicleId);
  const bodyInspections = inspectionsForVehicle(inspections, vehicleId).filter(i =>
    ["weekly-bodywork", "onboarding-baseline", "yard-check", "reported-damage", "routine-inspection"].includes(
      i.inspectionType,
    ),
  );
  const lastBodyInspection = bodyInspections[0];

  return {
    vehicleId,
    openDamageCount: openDamage.length,
    knownDamageAreas: vehicleDamage.filter(d => !["closed"].includes(d.status)).length,
    openReportCount: openDamage.length,
    awaitingAssessmentCount: openDamage.filter(d => AWAITING_ASSESSMENT_STATUSES.has(d.status)).length,
    repairInProgressCount: openDamage.filter(d => REPAIR_IN_PROGRESS_STATUSES.has(d.status)).length,
    lastBodyInspectionAt: lastBodyInspection?.completedAt ?? lastBodyInspection?.startedAt,
    hasNoKnownDamage: openDamage.length === 0 && vehicleDamage.length === 0,
  };
}

export function vehicleMatchesSummaryFilter(
  summary: VehicleBodyworkSummary,
  vehicle: Vehicle,
  filter: FleetSummaryFilter,
): boolean {
  switch (filter) {
    case "vehicles_with_damage":
      return summary.knownDamageAreas > 0 || summary.openDamageCount > 0;
    case "open_reports":
      return summary.openReportCount > 0;
    case "awaiting_assessment":
      return summary.awaitingAssessmentCount > 0;
    case "repairs_in_progress":
      return summary.repairInProgressCount > 0 || vehicle.status === "In Workshop";
    default:
      return true;
  }
}

export function vehicleMatchesDamageFilter(
  summary: VehicleBodyworkSummary,
  vehicle: Vehicle,
  damageRecords: DamageRecord[],
  filter: FleetDamageFilter,
): boolean {
  const openDamage = openDamageForVehicle(damageRecords, vehicle.id);

  switch (filter) {
    case "all":
      return true;
    case "damage_recorded":
      return summary.knownDamageAreas > 0;
    case "no_damage":
      return summary.hasNoKnownDamage;
    case "new_reported":
      return openDamage.some(d => d.status === "suspected" || d.status === "awaiting_review");
    case "awaiting_assessment":
      return openDamage.some(d => AWAITING_ASSESSMENT_STATUSES.has(d.status));
    case "repair_required":
      return openDamage.some(d => REPAIR_REQUIRED_STATUSES.has(d.status));
    case "repair_booked":
      return openDamage.some(d => REPAIR_BOOKED_STATUSES.has(d.status));
    case "repair_in_progress":
      return openDamage.some(d => REPAIR_IN_PROGRESS_STATUSES.has(d.status));
    case "repair_completed":
      return damageRecords.some(
        d => d.vehicleId === vehicle.id && ["repaired", "closed"].includes(d.status),
      );
    case "vor":
      return vehicle.status === "VOR";
    default:
      return true;
  }
}

export function matchesVehicleSearch(
  vehicle: Vehicle,
  query: string,
  depotName?: string | null,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const fleetLabel = formatFleetNumber(vehicle.id).toLowerCase();
  const haystack = [vehicle.reg, vehicle.type, vehicle.bayId, fleetLabel, depotName ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

export function formatFleetNumber(vehicleId: string): string {
  const digits = vehicleId.replace(/\D/g, "");
  if (!digits) return vehicleId;
  return digits.padStart(3, "0");
}

export function formatLastInspectionLabel(iso?: string): string {
  if (!iso) return "No body inspection recorded";
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  if (sameDay) {
    return `Last checked today · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `Last full body inspection: ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
}

export interface DamageMarkerDisplay {
  label: string;
  toneClass: string;
  icon: string;
}

export function damageMarkerDisplay(status: DamageRecordStatus): DamageMarkerDisplay {
  if (["repaired", "closed"].includes(status)) {
    return { label: "Repaired", toneClass: "bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]", icon: "✓" };
  }
  if (status === "monitoring" || status === "confirmed") {
    return { label: "Monitoring", toneClass: "bg-[#fff6ed] text-[#c4320a] border-[#fddcab]", icon: "◎" };
  }
  if (["repair_required", "suspected", "awaiting_review"].includes(status)) {
    return { label: "Repair required", toneClass: "bg-[#fef3f2] text-[#b42318] border-[#fecdca]", icon: "!" };
  }
  if (["repair_scheduled", "under_repair", "awaiting_verification"].includes(status)) {
    return { label: "Repair in progress", toneClass: "bg-[#f4f3ff] text-[#5925dc] border-[#d9d6fe]", icon: "↻" };
  }
  return { label: status.replace(/_/g, " "), toneClass: "bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]", icon: "•" };
}

export function severityLabel(severity: DamageSeverity): string {
  if (severity === "cosmetic") return "Cosmetic";
  if (severity === "operational") return "Moderate";
  return "Serious";
}

export function vehicleInServiceLabel(status: VehicleStatus): string {
  if (status === "VOR") return "Off road";
  if (status === "In Workshop") return "In workshop";
  if (status === "Off-site") return "Off site";
  if (status === "Awaiting Check") return "Check due";
  return "In service";
}

export function vehicleHasBaseline(
  profiles: Record<string, ReturnType<typeof getConditionProfile>>,
  vehicleId: string,
): boolean {
  const profile = getConditionProfile(profiles, vehicleId);
  return profile.baselineStatus === "approved" || profile.baselineStatus === "not_required";
}
