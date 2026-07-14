import type { OutboxMutationType } from "@/types/sync";
import type { OpsCommandType, OfflineCommand, PlatformEventName } from "@veyvio/ops";
import {
  createOfflineCommand,
  globalCommandApplicator,
  commandTypeToEvent,
  createPlatformEvent,
  globalPlatformEventBus,
} from "@veyvio/ops";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";
import { getDeviceId } from "@/platform/device/device-id";

const TYPE_MAP: Partial<Record<OutboxMutationType, OpsCommandType>> = {
  "duty.acknowledge": "duty.acknowledge",
  "duty.clock_in": "duty.clock_in",
  "duty.complete": "duty.complete",
  "vehicle.verify": "vehicle.verify",
  "vehicle.check.submit": "vehicle.check.submit",
  "vehicle.handback": "vehicle.handback",
  "journey.start": "journey.start",
  "journey.complete": "journey.complete",
  "journey.break.start": "journey.break.start",
  "journey.break.end": "journey.break.end",
  "journey.note.add": "journey.note.add",
  "delay.report": "delay.report",
  "stop.arrive": "stop.arrive",
  "passenger.outcome": "passenger.outcome",
  "incident.report": "incident.report",
  "defect.report": "defect.report",
};

/** Optimistic reservations so queued commands on the same aggregate get ascending expectedVersion. */
const pendingVersionByAggregate = new Map<string, number>();

export function mapMutationToOpsCommand(type: OutboxMutationType): OpsCommandType | null {
  return TYPE_MAP[type] ?? null;
}

export function buildCommandEnvelope(input: {
  type: OutboxMutationType;
  aggregateId: string;
  payload: unknown;
  expectedVersion?: number;
  correlationId?: string;
}): OfflineCommand | null {
  const commandType = mapMutationToOpsCommand(input.type);
  if (!commandType) return null;

  const tenancy = getTenancySnapshot();
  const session = getSessionSnapshot();
  if (!tenancy.companyId || !tenancy.depotId || !session.user?.id) return null;

  const applied = globalCommandApplicator.getVersion(input.aggregateId);
  const pending = pendingVersionByAggregate.get(input.aggregateId) ?? applied;
  const expectedVersion = input.expectedVersion ?? pending;
  pendingVersionByAggregate.set(input.aggregateId, expectedVersion + 1);

  return createOfflineCommand({
    commandType,
    aggregateId: input.aggregateId,
    expectedVersion,
    tenantId: tenancy.companyId,
    depotId: tenancy.depotId,
    actorId: session.user.id,
    deviceId: getDeviceId(),
    payload: input.payload,
    correlationId: input.correlationId,
  });
}

/** Apply once; emit named platform event. Returns false if duplicate commandId. */
export function applyOfflineCommandIdempotent(command: OfflineCommand): {
  applied: boolean;
  duplicate: boolean;
  newVersion: number;
  eventType: string;
} {
  const result = globalCommandApplicator.apply(command, () => {
    /* domain side-effects handled by mutateMockDuty */
  });

  if (result.applied) {
    pendingVersionByAggregate.set(command.aggregateId, result.newVersion);
    const eventType = commandTypeToEvent(command.commandType) as PlatformEventName;
    const event = createPlatformEvent({
      eventType,
      tenantId: command.tenantId,
      depotId: command.depotId,
      actorId: command.actorId,
      correlationId: command.correlationId,
      aggregateId: command.aggregateId,
      aggregateVersion: result.newVersion,
      payload: command.payload,
    });
    globalPlatformEventBus.publish(event);
  }

  return {
    applied: result.applied,
    duplicate: result.duplicate,
    newVersion: result.newVersion,
    eventType: result.eventType,
  };
}

export function aggregateIdFromPayload(type: OutboxMutationType, payload: unknown): string {
  const p = payload as {
    dutyId?: string;
    journeyId?: string;
    vehicleId?: string;
    stopId?: string;
    localIncidentId?: string;
    driverReportMetadata?: { localIncidentId?: string };
  };
  if (type === "incident.report") {
    return (
      p.driverReportMetadata?.localIncidentId ??
      p.localIncidentId ??
      `incident_${Date.now()}`
    );
  }
  if (type.startsWith("vehicle.") && p.vehicleId) return p.vehicleId;
  if (type.startsWith("journey.") && p.journeyId) return p.journeyId;
  if (type === "stop.arrive" && p.stopId) return p.stopId;
  return p.dutyId ?? `agg_${type}`;
}
