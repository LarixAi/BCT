/** Cross-app body condition inspection types — shared by Yard, Command, Driver, Maintenance. */

export const BODY_INSPECTION_TYPES = [
  "initial_baseline",
  "routine",
  "start_shift_handover",
  "end_shift_return",
  "depot_transfer",
  "reported_damage",
  "after_incident",
  "post_repair",
  "lease_return",
  "disposal",
  "other",
] as const;

export type BodyInspectionType = (typeof BODY_INSPECTION_TYPES)[number];

export const BODY_INSPECTION_STATUSES = [
  "draft",
  "in_progress",
  "submitted",
  "awaiting_review",
  "returned_for_clarification",
  "approved",
  "escalated",
  "superseded",
  "cancelled",
] as const;

export type BodyInspectionStatus = (typeof BODY_INSPECTION_STATUSES)[number];

export const DAMAGE_CASE_STATUSES = [
  "provisional",
  "confirmed_existing",
  "confirmed_new",
  "under_review",
  "disputed",
  "awaiting_estimate",
  "approved_for_repair",
  "repair_scheduled",
  "repair_in_progress",
  "repaired_awaiting_inspection",
  "closed",
  "monitoring",
  "insurer_case",
  "no_action_required",
] as const;

export type DamageCaseStatus = (typeof DAMAGE_CASE_STATUSES)[number];

export const DAMAGE_SEVERITIES = ["cosmetic", "minor_operational", "major", "critical"] as const;
export type DamageSeverityLevel = (typeof DAMAGE_SEVERITIES)[number];

export const VEHICLE_BODY_STATUSES = [
  "good",
  "cosmetic_damage",
  "repair_required",
  "restricted",
  "vor",
  "awaiting_assessment",
  "undergoing_repair",
] as const;

export type VehicleBodyStatus = (typeof VEHICLE_BODY_STATUSES)[number];

export const OBSERVATION_CLASSIFICATIONS = [
  "same_unchanged",
  "existing_worsened",
  "new_separate",
  "repaired_returned",
  "unsure_supervisor_review",
] as const;

export type ObservationClassificationCode = (typeof OBSERVATION_CLASSIFICATIONS)[number];

export const ACKNOWLEDGEMENT_TYPES = [
  "condition_accepted",
  "condition_differs",
  "unable_to_inspect",
  "new_damage_found",
  "no_new_damage",
  "damage_already_reported",
  "could_not_fully_inspect",
] as const;

export type AcknowledgementType = (typeof ACKNOWLEDGEMENT_TYPES)[number];

export const BODY_INSPECTION_TYPE_LABELS: Record<BodyInspectionType, string> = {
  initial_baseline: "Initial fleet baseline",
  routine: "Routine yard inspection",
  start_shift_handover: "Start-of-shift handover",
  end_shift_return: "End-of-shift return",
  depot_transfer: "Depot transfer",
  reported_damage: "Reported damage",
  after_incident: "After incident",
  post_repair: "Post-repair verification",
  lease_return: "Lease return",
  disposal: "Disposal inspection",
  other: "Other",
};

export const DAMAGE_SEVERITY_LABELS: Record<DamageSeverityLevel, string> = {
  cosmetic: "Cosmetic",
  minor_operational: "Minor operational",
  major: "Major",
  critical: "Critical",
};

export const VEHICLE_BODY_STATUS_LABELS: Record<VehicleBodyStatus, string> = {
  good: "Good",
  cosmetic_damage: "Cosmetic damage",
  repair_required: "Repair required",
  restricted: "Restricted",
  vor: "VOR",
  awaiting_assessment: "Awaiting assessment",
  undergoing_repair: "Undergoing repair",
};

/** Map legacy Yard InspectionType to canonical body inspection type. */
export function mapLegacyInspectionType(type: string): BodyInspectionType {
  const map: Record<string, BodyInspectionType> = {
    "onboarding-baseline": "initial_baseline",
    "start-of-day": "start_shift_handover",
    "yard-check": "routine",
    "driver-pre-use": "start_shift_handover",
    "return-to-yard": "end_shift_return",
    "post-incident": "after_incident",
    "weekly-bodywork": "routine",
    "post-repair": "post_repair",
    offboarding: "disposal",
    "manager-audit": "routine",
  };
  return map[type] ?? "other";
}

export function mapBodyInspectionTypeToLegacy(type: BodyInspectionType): string {
  const map: Partial<Record<BodyInspectionType, string>> = {
    initial_baseline: "onboarding-baseline",
    routine: "yard-check",
    start_shift_handover: "start-of-day",
    end_shift_return: "return-to-yard",
    reported_damage: "post-incident",
    after_incident: "post-incident",
    post_repair: "post-repair",
    disposal: "offboarding",
  };
  return map[type] ?? "yard-check";
}

export function buildDamageReference(year: number, caseSeq: number, observationSeq: number): string {
  return `BD-${year}-${String(caseSeq).padStart(5, "0")}-${String(observationSeq).padStart(2, "0")}`;
}
