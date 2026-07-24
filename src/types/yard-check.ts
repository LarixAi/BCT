export type YardCheckType =
  | "start-of-day"
  | "driver-changeover"
  | "between-run"
  | "return-to-yard"
  | "yard-spot"
  | "first-use"
  | "vor-assessment"
  | "return-to-service"
  | "scheduled-inspection";

export type CheckModule =
  | "roadworthiness"
  | "yard-readiness"
  | "equipment"
  | "job-suitability"
  | "yard-audit";

export type CheckArea = "cab" | "passenger" | "exterior" | "yard" | "equipment" | "job" | "audit";

export type SectionOutcome = "passed" | "defect" | "na";

export type CheckSafetyOutcome = "ready" | "attention" | "hold" | "vor";

export interface CheckSectionItem {
  id: string;
  label: string;
}

export interface CheckSectionDef {
  id: string;
  module: CheckModule;
  dvsaGroup?: number;
  area: CheckArea;
  title: string;
  description: string;
  items: CheckSectionItem[];
  safetyCritical?: boolean;
}

export interface YardCheckSectionResult {
  sectionId: string;
  title: string;
  outcome: SectionOutcome;
  note?: string;
  failedItemIds?: string[];
  safeToMove?: boolean;
  photoDataUrls?: string[];
}

export type YardCheckEvidenceKind =
  | "odometer"
  | "signature"
  | "photo"
  | "bodywork"
  | "fuel"
  | "note"
  | "video";

export interface YardCheckEvidenceItem {
  id: string;
  kind: YardCheckEvidenceKind | string;
  label: string;
  imageDataUrl: string;
  capturedAt?: string;
}

export interface YardCheckResult {
  id: string;
  vehicleId: string;
  checkType: YardCheckType;
  startedAt: string;
  completedAt: string;
  by: string;
  odometer?: number;
  inspectionId?: string;
  sections: YardCheckSectionResult[];
  evidence?: YardCheckEvidenceItem[];
  overallPassed: boolean;
  safetyOutcome: CheckSafetyOutcome;
  durationSeconds?: number;
  deviceLabel?: string;
  offlineSubmission?: boolean;
  /** @deprecated use completedAt */
  at?: string;
}

export interface CompleteYardCheckInput {
  checkType: YardCheckType;
  sections: YardCheckSectionResult[];
  startedAt: string;
  odometer?: number;
  durationSeconds?: number;
  deviceLabel?: string;
  offlineSubmission?: boolean;
}
