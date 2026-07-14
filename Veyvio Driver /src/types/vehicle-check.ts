/** Vehicle check gate statuses — Veyvio operational language */

export type VehicleCheckGateStatus =
  | "awaiting_check"
  | "check_in_progress"
  | "ready_for_service"
  | "attention_required"
  | "defect_reported"
  | "awaiting_approval"
  | "vehicle_held"
  | "vor"
  | "in_maintenance"
  | "returned_to_service"
  | "unavailable";

export type CheckItemResult = "unanswered" | "pass" | "defect" | "not_fitted";

export type CheckSessionPhase =
  | "verification"
  | "walkaround"
  | "bodywork"
  | "review"
  | "submitted";

export type DefectSeverity = "cosmetic" | "operational" | "safety_critical";

export type DefectTiming = "before_duty" | "during_duty" | "end_of_duty";

export type DriverSafetyAssessment = "unsafe" | "unsure" | "safe";

export type DamageObservationType = "existing" | "new" | "worsened" | "unclear";

export type CheckOutcome =
  | "nil_defects"
  | "defect_awaiting_review"
  | "safety_critical_blocked"
  | "offline_blocked";

export interface CheckSection {
  id: string;
  title: string;
  order: number;
  /** Shown only when vehicle is accessible */
  requiresAccessibility?: boolean;
  items: CheckItemDefinition[];
}

export interface CheckItemDefinition {
  id: string;
  sectionId: string;
  title: string;
  instructions: string[];
  order: number;
  allowNotFitted?: boolean;
  wheelPosition?: string;
  hasKnownIssue?: boolean;
  knownIssueLabel?: string;
}

export interface KnownBodyworkDamage {
  id: string;
  zone: string;
  label: string;
  recordedAt: string;
}

export interface KnownIssueSummary {
  cosmeticDamageCount: number;
  openSafetyDefectCount: number;
  bodyworkRecords: KnownBodyworkDamage[];
}

export interface CompletedCheckRecord {
  id: string;
  reference: string;
  completedAt: string;
  result: "nil_defects" | "defects_reported";
  odometer: number;
}

export interface VehicleChecksVehicle {
  vehicleId: string;
  registration: string;
  fleetNumber: string;
  make: string;
  model: string;
  vehicleType: string;
  depotName: string;
  imagePlaceholder?: string;
  mileage: number;
  fuelOrChargeLevel: string;
  accessibilityCapable: boolean;
  gateStatus: VehicleCheckGateStatus;
  vorRestrictions?: string[];
  lastCompletedCheck?: CompletedCheckRecord;
}

export interface VehicleChecksHome {
  vehicle: VehicleChecksVehicle;
  dutyId: string;
  dutyReference: string;
  dutyLabel: string;
  vehicleAssignmentId: string;
  knownIssues: KnownIssueSummary;
  activeCheckId?: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  reportDefectAlwaysAvailable: boolean;
}

export interface CheckItemResultRecord {
  itemId: string;
  result: CheckItemResult;
  recordedAt?: string;
  notes?: string;
  evidenceIds?: string[];
}

export interface DefectReportDraft {
  id: string;
  itemId: string;
  sectionId: string;
  component: string;
  position?: string;
  description: string;
  timing: DefectTiming;
  driverAssessment: DriverSafetyAssessment;
  severity: DefectSeverity;
  photoTaken: boolean;
  synced: boolean;
}

export interface VehicleCheckSession {
  id: string;
  vehicleId: string;
  dutyId: string;
  vehicleAssignmentId: string;
  templateVersion: string;
  phase: CheckSessionPhase;
  verified: boolean;
  verificationMismatch?: {
    scannedRegistration: string;
    scannedFleetNumber: string;
  };
  odometer?: number;
  fuelLevel?: string;
  dashboardPhotoTaken: boolean;
  startedAt: string;
  completedAt?: string;
  itemResults: Record<string, CheckItemResultRecord>;
  defects: DefectReportDraft[];
  bodyworkNoNewDamage?: boolean;
  newDamageReported?: boolean;
  declarationHeld?: boolean;
  outcome?: CheckOutcome;
  checkReference?: string;
  syncStatus: "synced" | "pending" | "offline_saved";
}

export interface VehicleCheckSubmission {
  session: VehicleCheckSession;
  sectionSummaries: { sectionId: string; title: string; passCount: number; defectCount: number; pendingCount: number }[];
}
