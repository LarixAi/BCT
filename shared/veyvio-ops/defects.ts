import type { AcceptedDefect, VehicleCheckOutcome } from "./types";

/** Driver's initial assessment — not the final operational classification. */
export type DriverDefectAssessment = "cosmetic" | "operational" | "safety_critical" | "unsure";

/** Authority-owned operational classification after triage. */
export type OpsDefectClassification =
  | "released_with_restrictions"
  | "held"
  | "VOR"
  | "repair_in_progress"
  | "rectified"
  | "closed";

export interface DefectCase {
  id: string;
  vehicleId: string;
  reportedByDriverId: string;
  description: string;
  location: string;
  driverAssessment: DriverDefectAssessment;
  /** Final status set by operations / maintenance — null until triaged */
  opsClassification: OpsDefectClassification | null;
  classifiedBy?: string;
  classifiedAt?: string;
  restrictions?: string;
  acceptanceExpiry?: string;
  linkedEvidenceIds: string[];
  maintenanceStatus?: string;
  createdAt: string;
}

export function driverAssessmentToProvisionalOutcome(
  assessment: DriverDefectAssessment,
): VehicleCheckOutcome {
  switch (assessment) {
    case "cosmetic":
      return "RELEASED_WITH_ACCEPTED_DEFECTS";
    case "operational":
      return "HELD_PENDING_REVIEW";
    case "safety_critical":
      return "VOR";
    case "unsure":
      return "HELD_PENDING_REVIEW";
    default:
      return "HELD_PENDING_REVIEW";
  }
}

export function applyOpsClassification(
  defect: DefectCase,
  classification: OpsDefectClassification,
  classifiedBy: string,
): DefectCase {
  return {
    ...defect,
    opsClassification: classification,
    classifiedBy,
    classifiedAt: new Date().toISOString(),
  };
}

export function opsClassificationBlocksUse(classification: OpsDefectClassification | null): boolean {
  return classification === "held" || classification === "VOR" || classification === "repair_in_progress";
}

export function provisionalBlocksUse(assessment: DriverDefectAssessment): boolean {
  return assessment === "safety_critical" || assessment === "unsure" || assessment === "operational";
}

export function toAcceptedDefectFromCase(defect: DefectCase, acceptedBy: string): AcceptedDefect {
  return {
    id: defect.id,
    description: defect.description,
    location: defect.location,
    classification:
      defect.driverAssessment === "safety_critical"
        ? "safety_critical"
        : defect.driverAssessment === "operational"
          ? "restricted"
          : "cosmetic",
    blocksUse: defect.opsClassification
      ? opsClassificationBlocksUse(defect.opsClassification)
      : provisionalBlocksUse(defect.driverAssessment),
    acceptedBy,
    acceptedAt: defect.classifiedAt ?? defect.createdAt,
    restrictions: defect.restrictions,
    evidenceIds: defect.linkedEvidenceIds,
    maintenanceStatus: defect.maintenanceStatus,
  };
}
