import type { AcceptedDefect, VehicleCheckOutcome, VehicleReadiness } from "./types";
import { outcomeAllowsRelease } from "./commands";

export function buildVehicleReadiness(input: {
  vehicleId: string;
  assignmentId: string;
  checkSessionId: string;
  outcome: VehicleCheckOutcome;
  validFrom?: string;
  validUntil?: string;
}): VehicleReadiness {
  const status = outcomeAllowsRelease(input.outcome)
    ? "released"
    : input.outcome === "HELD_PENDING_REVIEW" || input.outcome === "VOR"
      ? "held"
      : "in_progress";

  return {
    vehicleId: input.vehicleId,
    assignmentId: input.assignmentId,
    checkSessionId: input.checkSessionId,
    status,
    validFrom: input.validFrom ?? new Date().toISOString(),
    validUntil: input.validUntil,
    outcome: input.outcome,
  };
}

export function invalidateReadiness(
  readiness: VehicleReadiness,
  reason: string,
): VehicleReadiness {
  return {
    ...readiness,
    status: "required",
    invalidationReason: reason,
    outcome: undefined,
  };
}

export function formaliseKnownDefect(input: {
  id: string;
  description: string;
  location: string;
  blocksUse?: boolean;
  acceptedBy: string;
  acceptedAt?: string;
  restrictions?: string;
}): AcceptedDefect {
  return {
    id: input.id,
    description: input.description,
    location: input.location,
    classification: input.blocksUse ? "safety_critical" : "cosmetic",
    blocksUse: Boolean(input.blocksUse),
    acceptedBy: input.acceptedBy,
    acceptedAt: input.acceptedAt ?? new Date().toISOString(),
    restrictions: input.restrictions,
    maintenanceStatus: "monitored",
  };
}
