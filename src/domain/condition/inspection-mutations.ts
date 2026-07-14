import type {
  DamageObservation,
  DamageRecord,
  DamageReview,
  InspectionMedia,
  ObservationClassification,
  VehicleConditionProfile,
  VehicleConditionSnapshot,
  VehicleInspection,
  InspectionType,
} from "@/types/condition";
import type { VehicleType } from "@/types/yard";
import { formatDamageRef } from "@/domain/condition/condition-helpers";

type IdFactory = (prefix: string) => string;

export function createInspection(
  vehicleId: string,
  inspectionType: InspectionType,
  startedBy: string,
  startedAt: string,
  nextId: IdFactory,
  opts?: { mileage?: number; checkId?: string },
): VehicleInspection {
  return {
    id: nextId("insp"),
    vehicleId,
    inspectionType,
    sourceApp: "yard",
    status: "in_progress",
    startedBy,
    startedAt,
    mileage: opts?.mileage,
    checkId: opts?.checkId,
    location: "B3",
  };
}

export function completeInspectionRecord(
  inspection: VehicleInspection,
  completedAt: string,
  opts?: { awaitingApproval?: boolean },
): VehicleInspection {
  return {
    ...inspection,
    status: opts?.awaitingApproval ? "awaiting_approval" : "approved",
    completedAt,
    approvedAt: opts?.awaitingApproval ? undefined : completedAt,
    approvedBy: opts?.awaitingApproval ? undefined : inspection.startedBy,
  };
}

export function approveBaselineInspection(
  inspection: VehicleInspection,
  approvedBy: string,
  approvedAt: string,
): VehicleInspection {
  return {
    ...inspection,
    status: "approved",
    approvedBy,
    approvedAt,
  };
}

export function createDamageRecordFromObservation(
  obs: DamageObservation,
  nextId: IdFactory,
): DamageRecord {
  return {
    id: nextId("dmg"),
    vehicleId: obs.vehicleId,
    zoneId: obs.zoneId,
    damageType: obs.damageType ?? "other",
    severity: obs.severity ?? "cosmetic",
    status: "awaiting_review",
    origin: obs.reportSource === "driver_report" ? "reported_during_duty" : "discovered_yard_check",
    title: `${obs.damageType ?? "Damage"} — ${obs.zoneId.replace(/-/g, " ")}`,
    description: obs.description,
    firstObservedAt: obs.observedAt,
    firstObservationId: obs.id,
    lastConfirmedAt: obs.observedAt,
    operationalImpact: obs.severity === "operational" || obs.severity === "safety_critical",
  };
}

export function createSnapshotFromInspection(
  inspection: VehicleInspection,
  openDamageCount: number,
  conditionRating: VehicleConditionProfile["conditionRating"],
  approvedBy: string,
  approvedAt: string,
  nextId: IdFactory,
  summary: string,
): VehicleConditionSnapshot {
  return {
    id: nextId("snap"),
    vehicleId: inspection.vehicleId,
    inspectionId: inspection.id,
    approvedAt,
    approvedBy,
    conditionRating,
    openDamageCount,
    summary,
  };
}

export function updateProfileAfterBaseline(
  profile: VehicleConditionProfile,
  inspectionId: string,
  snapshotId: string,
  conditionRating: VehicleConditionProfile["conditionRating"],
): VehicleConditionProfile {
  return {
    ...profile,
    baselineStatus: "approved",
    conditionRating,
    latestApprovedInspectionId: inspectionId,
    latestSnapshotId: snapshotId,
  };
}

export function buildDamageReview(
  observationId: string,
  reviewedBy: string,
  reviewedAt: string,
  decision: ObservationClassification,
  nextId: IdFactory,
  opts?: { linkedDamageId?: string; notes?: string; operationalDecision?: string },
): DamageReview {
  return {
    id: nextId("drev"),
    observationId,
    reviewedBy,
    reviewedAt,
    decision,
    linkedDamageId: opts?.linkedDamageId,
    notes: opts?.notes,
    operationalDecision: opts?.operationalDecision,
  };
}

export function damageRefLabel(id: string): string {
  return formatDamageRef(id);
}

export function defaultInspectionTypeForVehicle(
  profile: VehicleConditionProfile,
): InspectionType {
  if (profile.baselineStatus !== "approved") return "onboarding-baseline";
  return "yard-check";
}
