import type {
  DamageObservation,
  DamageRecord,
  DamageReview,
  InspectionMedia,
  VehicleConditionProfile,
  VehicleConditionSnapshot,
  VehicleInspection,
} from "@/types/condition";
import type { Vehicle } from "@/types/yard";

export function getConditionProfile(
  profiles: Record<string, VehicleConditionProfile>,
  vehicleId: string,
): VehicleConditionProfile {
  return profiles[vehicleId] ?? {
    vehicleId,
    baselineStatus: "not_started",
    conditionRating: "unknown",
  };
}

export function openDamageForVehicle(damageRecords: DamageRecord[], vehicleId: string): DamageRecord[] {
  return damageRecords.filter(
    d => d.vehicleId === vehicleId && !["repaired", "closed"].includes(d.status),
  );
}

export function damageForZone(records: DamageRecord[], vehicleId: string, zoneId: string): DamageRecord[] {
  return records.filter(d => d.vehicleId === vehicleId && d.zoneId === zoneId && !["repaired", "closed"].includes(d.status));
}

export function mediaForInspection(media: InspectionMedia[], inspectionId: string): InspectionMedia[] {
  return media.filter(m => m.inspectionId === inspectionId);
}

export function mediaForZone(media: InspectionMedia[], inspectionId: string, zoneId: string): InspectionMedia[] {
  return media.filter(m => m.inspectionId === inspectionId && m.vehicleZoneId === zoneId);
}

export function latestApprovedSnapshot(
  snapshots: VehicleConditionSnapshot[],
  vehicleId: string,
): VehicleConditionSnapshot | undefined {
  return snapshots
    .filter(s => s.vehicleId === vehicleId)
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))[0];
}

export function inspectionsForVehicle(inspections: VehicleInspection[], vehicleId: string): VehicleInspection[] {
  return inspections
    .filter(i => i.vehicleId === vehicleId)
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt));
}

export function pendingDamageReviews(
  observations: DamageObservation[],
  reviews: DamageReview[],
): DamageObservation[] {
  const reviewed = new Set(reviews.map(r => r.observationId));
  return observations
    .filter(o =>
      !reviewed.has(o.id)
      && ["new_not_reported", "new_previously_reported", "existing_worsened", "possible_new_review"].includes(o.classification),
    )
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

export function vehicleNeedsBaseline(profile: VehicleConditionProfile): boolean {
  return profile.baselineStatus !== "approved" && profile.baselineStatus !== "not_required";
}

export function conditionSummaryText(
  vehicle: Vehicle,
  profile: VehicleConditionProfile,
  openDamage: DamageRecord[],
): string {
  if (vehicleNeedsBaseline(profile)) return "Awaiting approved onboarding baseline";
  if (openDamage.some(d => d.severity === "safety_critical")) return "Safety-critical damage recorded";
  if (openDamage.length > 0) return `${openDamage.length} known damage area${openDamage.length > 1 ? "s" : ""}`;
  if (profile.conditionRating === "good") return "No known damage — last inspection satisfactory";
  return "Condition recorded";
}

export function formatDamageRef(id: string): string {
  const num = id.replace(/\D/g, "");
  return `DMG-${num.padStart(6, "0")}`;
}
