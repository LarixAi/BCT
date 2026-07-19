import type { OfflineCommand, OpsCommandType } from "./types";
import { createOfflineCommand } from "./commands";

export interface AppliedCommandResult {
  commandId: string;
  applied: boolean;
  duplicate: boolean;
  aggregateId: string;
  newVersion: number;
  eventType: string;
}

/**
 * Idempotent in-memory command applicator.
 * Re-sending the same commandId must not double-apply.
 */
export class IdempotentCommandApplicator {
  private applied = new Map<string, AppliedCommandResult>();
  private versions = new Map<string, number>();

  getVersion(aggregateId: string): number {
    return this.versions.get(aggregateId) ?? 0;
  }

  wasApplied(commandId: string): boolean {
    return this.applied.has(commandId);
  }

  apply(
    command: OfflineCommand,
    handler: (command: OfflineCommand) => void,
  ): AppliedCommandResult {
    const existing = this.applied.get(command.commandId);
    if (existing) {
      return { ...existing, duplicate: true, applied: false };
    }

    const current = this.getVersion(command.aggregateId);
    if (command.expectedVersion !== current) {
      throw new Error(
        `Version conflict on ${command.aggregateId}: expected ${command.expectedVersion}, have ${current}`,
      );
    }

    handler(command);
    const newVersion = current + 1;
    this.versions.set(command.aggregateId, newVersion);

    const result: AppliedCommandResult = {
      commandId: command.commandId,
      applied: true,
      duplicate: false,
      aggregateId: command.aggregateId,
      newVersion,
      eventType: commandTypeToEvent(command.commandType),
    };
    this.applied.set(command.commandId, result);
    return result;
  }

  reset(): void {
    this.applied.clear();
    this.versions.clear();
  }
}

export function commandTypeToEvent(type: OpsCommandType): string {
  const map: Record<OpsCommandType, string> = {
    "duty.acknowledge": "duty.acknowledged",
    "duty.clock_in": "driver.clocked_in",
    "duty.complete": "duty.completed",
    "vehicle.accept_assignment": "vehicle.assignment_accepted",
    "vehicle.verify": "vehicle.verified",
    "vehicle.check.submit": "vehicle_check.submitted",
    "journey.start": "journey.started",
    "journey.complete": "journey.completed",
    "journey.break.start": "journey.break_started",
    "journey.break.end": "journey.break_ended",
    "journey.note.add": "journey.note_added",
    "delay.report": "delay.reported",
    "vehicle.handback": "vehicle.returned",
    "stop.arrive": "stop.arrived",
    "passenger.outcome": "passenger.outcome_recorded",
    "incident.report": "incident.initial_submitted",
    "defect.report": "defect.reported",
    "resource.transaction.record": "resource.transaction.recorded",
  };
  return map[type] ?? type;
}

export function envelopeMutation(input: {
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
  return createOfflineCommand(input);
}

export const globalCommandApplicator = new IdempotentCommandApplicator();
