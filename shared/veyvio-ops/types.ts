/** Shared operational vocabulary for Driver, Admin, Yard. */

export type DutyLifecycleStatus =
  | "assigned"
  | "delivered"
  | "acknowledged"
  | "clocked_in"
  | "active"
  | "close_required"
  | "completed"
  | "blocked"
  | "cancelled"
  | "transferred"
  | "suspended";

export type JourneyLifecycleStatus =
  | "scheduled"
  | "released"
  | "ready"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "aborted"
  | "transferred"
  | "partially_completed";

export type VehicleUseSessionStatus =
  | "assigned"
  | "accepted"
  | "verified"
  | "checking"
  | "released"
  | "in_use"
  | "handback_required"
  | "returned"
  | "held"
  | "VOR"
  | "swap_required";

export type VehicleCheckOutcome =
  | "RELEASED_NO_DEFECTS"
  | "RELEASED_WITH_ACCEPTED_DEFECTS"
  | "HELD_PENDING_REVIEW"
  | "VOR"
  | "CHECK_SUBMISSION_PENDING_SYNC";

export type VehicleReadinessStatus = "required" | "in_progress" | "held" | "released";

/** Every journey screen receives this — UI never invents display names. */
export interface JourneyIdentity {
  journeyId: string;
  runId: string;
  runCode: string;
  displayName: string;
  version: number;
}

export interface VehicleReadiness {
  vehicleId: string;
  assignmentId: string;
  checkSessionId: string;
  status: VehicleReadinessStatus;
  validFrom: string;
  validUntil?: string;
  invalidationReason?: string;
  outcome?: VehicleCheckOutcome;
}

export type DriverEligibilityStatus = "eligible" | "eligible_with_warning" | "blocked";

export interface EligibilityBlocker {
  code: string;
  message: string;
}

export interface EligibilityWarning {
  code: string;
  message: string;
}

export interface DriverEligibilityDecision {
  status: DriverEligibilityStatus;
  evaluatedAt: string;
  expiresAt: string;
  policyVersion: string;
  blockers: EligibilityBlocker[];
  warnings: EligibilityWarning[];
}

export interface AcceptedDefect {
  id: string;
  description: string;
  location: string;
  classification: "cosmetic" | "restricted" | "safety_critical";
  blocksUse: boolean;
  acceptedBy: string;
  acceptedAt: string;
  reviewBy?: string;
  restrictions?: string;
  evidenceIds?: string[];
  maintenanceStatus?: string;
}

export type OpsCommandType =
  | "duty.acknowledge"
  | "duty.clock_in"
  | "duty.complete"
  | "vehicle.accept_assignment"
  | "vehicle.verify"
  | "vehicle.check.submit"
  | "journey.start"
  | "journey.complete"
  | "vehicle.handback"
  | "stop.arrive"
  | "passenger.outcome"
  | "incident.report"
  | "defect.report";

export interface OfflineCommand {
  commandId: string;
  commandType: OpsCommandType;
  aggregateId: string;
  expectedVersion: number;
  tenantId: string;
  depotId: string;
  actorId: string;
  deviceId: string;
  occurredAt: string;
  createdOfflineAt?: string;
  correlationId: string;
  payload: unknown;
}

export interface JourneyRecord {
  identity: JourneyIdentity;
  dutyId: string;
  status: JourneyLifecycleStatus;
  vehicleId?: string;
  assignmentId?: string;
}

export interface DutyRecord {
  id: string;
  reference: string;
  status: DutyLifecycleStatus;
  version: number;
  journeyIds: string[];
  vehicleId?: string;
  assignmentId?: string;
  clockedInAt?: string;
  fitForDutyDeclaredAt?: string;
}

export interface VehicleUseSession {
  id: string;
  vehicleId: string;
  assignmentId: string;
  dutyId: string;
  status: VehicleUseSessionStatus;
  checkSessionId?: string;
  readiness?: VehicleReadiness;
  acceptedDefects: AcceptedDefect[];
}
