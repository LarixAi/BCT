import type {
  DutyLifecycleStatus,
  JourneyLifecycleStatus,
  JourneyRecord,
  OfflineCommand,
  OpsCommandType,
  VehicleReadiness,
  VehicleCheckOutcome,
} from "./types";
import {
  assertDutyTransition,
  assertJourneyTransition,
  canTransitionJourney,
} from "./state-machines";

export function createOfflineCommand(input: {
  commandType: OpsCommandType;
  aggregateId: string;
  expectedVersion: number;
  tenantId: string;
  depotId: string;
  actorId: string;
  deviceId: string;
  payload: unknown;
  correlationId?: string;
}): OfflineCommand {
  const now = new Date().toISOString();
  return {
    commandId: `cmd_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
    commandType: input.commandType,
    aggregateId: input.aggregateId,
    expectedVersion: input.expectedVersion,
    tenantId: input.tenantId,
    depotId: input.depotId,
    actorId: input.actorId,
    deviceId: input.deviceId,
    occurredAt: now,
    correlationId: input.correlationId ?? `cor_${Date.now()}`,
    payload: input.payload,
  };
}

/**
 * Invariant: startJourney must never transition the duty.
 * Duty must already be clocked_in or active.
 */
export function canStartJourney(input: {
  dutyStatus: DutyLifecycleStatus;
  journeyStatus: JourneyLifecycleStatus;
}): { allowed: boolean; reason?: string } {
  if (input.dutyStatus !== "clocked_in" && input.dutyStatus !== "active") {
    return {
      allowed: false,
      reason: "Clock into the duty before starting a journey.",
    };
  }
  if (input.journeyStatus !== "ready" && input.journeyStatus !== "released") {
    return {
      allowed: false,
      reason: "This journey is not ready to start.",
    };
  }
  if (!canTransitionJourney(input.journeyStatus === "released" ? "released" : "ready", "in_progress")) {
    return { allowed: false, reason: "Invalid journey start transition." };
  }
  return { allowed: true };
}

export function applyClockInDuty(
  status: DutyLifecycleStatus,
): DutyLifecycleStatus {
  if (status === "clocked_in" || status === "active") return status;
  assertDutyTransition(status, "clocked_in");
  return "clocked_in";
}

export function applyStartJourney(
  journeys: JourneyRecord[],
  journeyId: string,
  dutyStatus: DutyLifecycleStatus,
): { journeys: JourneyRecord[]; dutyStatus: DutyLifecycleStatus } {
  const journey = journeys.find((j) => j.identity.journeyId === journeyId);
  if (!journey) {
    throw new Error(`Journey not found: ${journeyId}`);
  }

  const gate = canStartJourney({
    dutyStatus,
    journeyStatus: journey.status,
  });
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "Cannot start journey");
  }

  const from: JourneyLifecycleStatus =
    journey.status === "released" ? "released" : journey.status === "ready" ? "ready" : journey.status;
  if (from !== "released" && from !== "ready") {
    throw new Error(`Cannot start journey from ${journey.status}`);
  }

  // Move released → ready → in_progress if needed
  let nextStatus: JourneyLifecycleStatus = journey.status;
  if (nextStatus === "released") {
    assertJourneyTransition("released", "ready");
    nextStatus = "ready";
  }
  assertJourneyTransition(nextStatus, "in_progress");

  const updated = journeys.map((j) =>
    j.identity.journeyId === journeyId
      ? { ...j, status: "in_progress" as const }
      : j,
  );

  // Duty becomes active when first journey starts — never "start duty" as a side effect of inventing clock-in
  const nextDuty: DutyLifecycleStatus =
    dutyStatus === "clocked_in" ? "active" : dutyStatus;

  if (dutyStatus === "clocked_in") {
    assertDutyTransition("clocked_in", "active");
  }

  return { journeys: updated, dutyStatus: nextDuty };
}

export function applyCompleteJourney(
  journeys: JourneyRecord[],
  journeyId: string,
): { journeys: JourneyRecord[]; allComplete: boolean } {
  const journey = journeys.find((j) => j.identity.journeyId === journeyId);
  if (!journey) throw new Error(`Journey not found: ${journeyId}`);
  assertJourneyTransition(journey.status, "completed");

  const updated = journeys.map((j) =>
    j.identity.journeyId === journeyId ? { ...j, status: "completed" as const } : j,
  );
  const allComplete = updated.every((j) => j.status === "completed" || j.status === "cancelled");
  return { journeys: updated, allComplete };
}

/** A readiness for vehicle A must never satisfy vehicle B. */
export function readinessCoversVehicle(
  readiness: VehicleReadiness | null | undefined,
  vehicleId: string,
  assignmentId?: string,
): boolean {
  if (!readiness) return false;
  if (readiness.vehicleId !== vehicleId) return false;
  if (assignmentId && readiness.assignmentId !== assignmentId) return false;
  return readiness.status === "released";
}

export function outcomeAllowsRelease(outcome: VehicleCheckOutcome): boolean {
  return (
    outcome === "RELEASED_NO_DEFECTS" ||
    outcome === "RELEASED_WITH_ACCEPTED_DEFECTS"
  );
}
