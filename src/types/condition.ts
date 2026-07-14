import type { VehicleType } from "@/types/yard";

export type InspectionType =
  | "onboarding-baseline"
  | "start-of-day"
  | "yard-check"
  | "driver-pre-use"
  | "return-to-yard"
  | "post-incident"
  | "weekly-bodywork"
  | "post-repair"
  | "offboarding"
  | "manager-audit";

export type InspectionStatus =
  | "draft"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "awaiting_sync";

export type InspectionSourceApp = "yard" | "driver" | "maintenance";

export type MediaType = "photo" | "video";

export type MediaQualityStatus = "accepted" | "retake_required" | "pending";

export type EvidenceRole = "context" | "close_up" | "secondary_angle" | "walkaround_video";

export type DamageType =
  | "scratch"
  | "scuff"
  | "dent"
  | "crack"
  | "paint_damage"
  | "paint_transfer"
  | "corrosion"
  | "broken_trim"
  | "broken_light"
  | "broken_mirror"
  | "glass_damage"
  | "panel_misalignment"
  | "missing_component"
  | "impact_damage"
  | "other";

export type DamageSeverity = "cosmetic" | "operational" | "safety_critical";

export type DamageRecordStatus =
  | "suspected"
  | "awaiting_review"
  | "confirmed"
  | "monitoring"
  | "repair_required"
  | "repair_scheduled"
  | "under_repair"
  | "awaiting_verification"
  | "repaired"
  | "closed"
  | "disputed";

export type DamageOrigin =
  | "existing_at_onboarding"
  | "reported_during_duty"
  | "discovered_at_return"
  | "discovered_yard_check"
  | "unreported_new"
  | "cause_unknown"
  | "incident_related";

export type ObservationClassification =
  | "no_damage"
  | "existing_unchanged"
  | "existing_worsened"
  | "new_previously_reported"
  | "new_not_reported"
  | "possible_new_review"
  | "repaired"
  | "unable_to_determine";

export type ReportSource = "yard_inspection" | "driver_report" | "manager_audit" | "maintenance";

export type BaselineStatus =
  | "not_required"
  | "not_started"
  | "in_progress"
  | "awaiting_approval"
  | "approved";

export type ConditionRating = "good" | "fair" | "poor" | "unknown";

export interface BodyZone {
  id: string;
  label: string;
  /** SVG overlay region key for diagram */
  diagramKey: string;
}

export interface CaptureSlot {
  id: string;
  label: string;
  zoneId?: string;
  required: boolean;
  kind: "exterior" | "interior" | "equipment" | "video";
}

export interface InspectionMedia {
  id: string;
  inspectionId: string;
  vehicleZoneId?: string;
  captureSlotId?: string;
  mediaType: MediaType;
  dataUrl: string;
  thumbnailDataUrl?: string;
  capturedAt: string;
  uploadedAt?: string;
  capturedBy: string;
  qualityStatus: MediaQualityStatus;
  qualityNote?: string;
  offlineCapture: boolean;
  evidenceRole?: EvidenceRole;
  checksum?: string;
}

export interface VehicleInspection {
  id: string;
  vehicleId: string;
  inspectionType: InspectionType;
  sourceApp: InspectionSourceApp;
  status: InspectionStatus;
  startedBy: string;
  startedAt: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  mileage?: number;
  location?: string;
  checkId?: string;
  dutyId?: string;
  notes?: string;
}

export interface DamageRecord {
  id: string;
  vehicleId: string;
  zoneId: string;
  damageType: DamageType;
  severity: DamageSeverity;
  status: DamageRecordStatus;
  origin: DamageOrigin;
  title: string;
  description?: string;
  firstObservedAt: string;
  firstObservationId: string;
  lastConfirmedAt: string;
  operationalImpact?: boolean;
  defectId?: string;
}

export interface DamageObservation {
  id: string;
  damageId?: string;
  inspectionId: string;
  vehicleId: string;
  zoneId: string;
  reportSource: ReportSource;
  reportedBy: string;
  observedAt: string;
  classification: ObservationClassification;
  damageType?: DamageType;
  description?: string;
  severity?: DamageSeverity;
  safeToOperate?: boolean;
  approximateSize?: string;
  incidentRelated?: boolean;
  mediaIds: string[];
  dutyId?: string;
  tripId?: string;
}

export interface DamageReview {
  id: string;
  observationId: string;
  reviewedBy: string;
  reviewedAt: string;
  decision: ObservationClassification;
  linkedDamageId?: string;
  notes?: string;
  operationalDecision?: string;
}

export interface VehicleConditionSnapshot {
  id: string;
  vehicleId: string;
  inspectionId: string;
  approvedAt: string;
  approvedBy: string;
  conditionRating: ConditionRating;
  openDamageCount: number;
  summary: string;
  supersedesSnapshotId?: string;
}

export interface CustodyEvent {
  id: string;
  vehicleId: string;
  at: string;
  kind: "yard_inspection" | "driver_assignment" | "duty_start" | "driver_changeover" | "return_to_depot" | "workshop" | "unassigned" | "damage_review";
  label: string;
  actor?: string;
  referenceId?: string;
}

export interface VehicleConditionProfile {
  vehicleId: string;
  baselineStatus: BaselineStatus;
  conditionRating: ConditionRating;
  latestSnapshotId?: string;
  latestApprovedInspectionId?: string;
}

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  scratch: "Scratch",
  scuff: "Scuff",
  dent: "Dent",
  crack: "Crack",
  paint_damage: "Paint damage",
  paint_transfer: "Paint transfer",
  corrosion: "Corrosion",
  broken_trim: "Broken trim",
  broken_light: "Broken light",
  broken_mirror: "Broken mirror",
  glass_damage: "Glass damage",
  panel_misalignment: "Panel misalignment",
  missing_component: "Missing component",
  impact_damage: "Impact damage",
  other: "Other",
};

export const OBSERVATION_LABELS: Record<ObservationClassification, string> = {
  no_damage: "No damage found",
  existing_unchanged: "Existing damage — unchanged",
  existing_worsened: "Existing damage — worsened",
  new_previously_reported: "New damage — previously reported",
  new_not_reported: "New damage — not previously reported",
  possible_new_review: "Possible new — further review required",
  repaired: "Damage repaired",
  unable_to_determine: "Unable to determine from evidence",
};

export type CaptureTemplateKey = VehicleType | "default";

export type SimilarityConfidence = "low" | "medium" | "high";

export interface EvidenceSimilarityHint {
  score: number;
  confidence: SimilarityConfidence;
  suggestedClassification: ObservationClassification;
  summary: string;
  factors: string[];
  matchedDamageId?: string;
  duplicateCandidate: boolean;
  disclaimer: string;
}

export interface ConditionAnalyticsSummary {
  openDamageCount: number;
  openDamageBySeverity: Record<DamageSeverity, number>;
  pendingReviewCount: number;
  unreportedNewCount: number;
  awaitingVerificationCount: number;
  missingBaselineCount: number;
  activeRepairCount: number;
  topDamageZones: { zoneId: string; count: number }[];
  vehiclesWithRecurringDamage: { vehicleId: string; count: number }[];
  riskAlerts: { id: string; label: string; detail: string; tone: "warn" | "vor" }[];
}

export type RepairWorkOrderStatus =
  | "open"
  | "scheduled"
  | "in_progress"
  | "awaiting_verification"
  | "completed"
  | "cancelled";

export interface RepairWorkOrder {
  id: string;
  vehicleId: string;
  damageId?: string;
  defectId?: string;
  status: RepairWorkOrderStatus;
  description: string;
  assignedTo?: string;
  requestedAt: string;
  requestedBy: string;
  completedAt?: string;
  verificationInspectionId?: string;
  notes?: string;
}
