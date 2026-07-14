import type { CommandResult, CommandTransport, DomainEvent, OfflineCommand } from "@veyvio/ops";
import {
  createOfflineCommand,
  globalPlatformEventBus,
  queuePlatformEventForConsumers,
  type OpsCommandType,
} from "@veyvio/ops";
import {
  applyOfflineCommandIdempotent,
  mapMutationToOpsCommand,
} from "@/domain/ops/offline-commands";
import {
  getMockDutyDetail,
  mutateMockDuty,
  syncMockDutyDetail,
} from "@/data/mocks/duties";
import { useDriverStore } from "@/store/driver";
import { queueDriverIncidentForAdmin, type ReportIncidentHubInput } from "@veyvio/incidents";
import type { OutboxMutation, OutboxMutationType } from "@/types/sync";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Prefer live UI projection for gated mutations so optimistic Zustand state
 * is visible to the mock server Map without screens writing the Map directly.
 */
function mergeLiveDutyIntoMock(dutyId: string | undefined) {
  if (!dutyId) return;
  const live = useDriverStore.getState().dutyDetails[dutyId];
  if (!live) return;
  syncMockDutyDetail(live);
}

function mutationToOfflineCommand(mutation: OutboxMutation): OfflineCommand | null {
  const commandType = mapMutationToOpsCommand(mutation.type);
  if (!commandType || !mutation.commandId || mutation.aggregateId == null) return null;
  const command = createOfflineCommand({
    commandType: commandType as OpsCommandType,
    aggregateId: mutation.aggregateId,
    expectedVersion: mutation.expectedVersion ?? 0,
    tenantId: mutation.companyId,
    depotId: mutation.depotId,
    actorId: mutation.userId,
    deviceId: mutation.deviceId,
    payload: mutation.payload,
    correlationId: mutation.correlationId ?? mutation.idempotencyKey,
  });
  return { ...command, commandId: mutation.commandId };
}

function opsTypeToOutboxType(commandType: OpsCommandType): OutboxMutationType {
  if (commandType === "vehicle.accept_assignment") return "vehicle.verify";
  if (commandType === "vehicle.handback") return "vehicle.handback";
  return commandType as OutboxMutationType;
}

/**
 * Mock transport that satisfies CommandTransport.
 * Simulated server state lives in dutyStore Map — not written by screens.
 */
export class MockCommandTransport implements CommandTransport {
  async send(command: OfflineCommand): Promise<CommandResult> {
    await delay(200);

    const payload = command.payload as { dutyId?: string };
    if (
      command.commandType === "duty.clock_in" ||
      command.commandType === "journey.start" ||
      command.commandType === "journey.complete" ||
      command.commandType === "journey.break.start" ||
      command.commandType === "journey.break.end" ||
      command.commandType === "journey.note.add" ||
      command.commandType === "delay.report" ||
      command.commandType === "vehicle.handback" ||
      command.commandType === "passenger.outcome" ||
      command.commandType === "stop.arrive" ||
      command.commandType === "vehicle.check.submit"
    ) {
      mergeLiveDutyIntoMock(payload.dutyId);
    }

    try {
      const applied = applyOfflineCommandIdempotent(command);
      if (applied.duplicate) {
        return {
          status: "accepted",
          commandId: command.commandId,
          aggregateId: command.aggregateId,
          serverVersion: applied.newVersion,
          events: [],
        };
      }

      const mutation: OutboxMutation = {
        localOperationId: `mock_${command.commandId}`,
        type: opsTypeToOutboxType(command.commandType),
        companyId: command.tenantId,
        depotId: command.depotId,
        userId: command.actorId,
        deviceId: command.deviceId,
        createdAt: command.occurredAt,
        payload: command.payload,
        status: "syncing",
        commandId: command.commandId,
        aggregateId: command.aggregateId,
        expectedVersion: command.expectedVersion,
        correlationId: command.correlationId,
      };

      if (command.commandType === "incident.report") {
        queueDriverIncidentForAdmin(command.payload as ReportIncidentHubInput);
      }

      mutateMockDuty(mutation);

      const events = globalPlatformEventBus
        .list()
        .filter((e) => e.correlationId === command.correlationId)
        .slice(-1) as DomainEvent[];
      for (const event of events) {
        queuePlatformEventForConsumers(event);
      }

      if (payload.dutyId) {
        const updated = getMockDutyDetail(payload.dutyId);
        if (updated) {
          useDriverStore.getState().projectDuty(updated);
        }
      }

      return {
        status: "accepted",
        commandId: command.commandId,
        aggregateId: command.aggregateId,
        serverVersion: applied.newVersion,
        events,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Command rejected";
      const isConflict = /version conflict|assignment changed|conflict/i.test(message);
      return {
        status: "rejected",
        commandId: command.commandId,
        reasonCode: isConflict ? "VERSION_CONFLICT" : "REJECTED",
        currentVersion: undefined,
        serverProjection: payload.dutyId ? getMockDutyDetail(payload.dutyId) : undefined,
      };
    }
  }
}

/** Bridge OutboxMutation → OfflineCommand for the sync engine. */
export function outboxMutationToCommand(mutation: OutboxMutation): OfflineCommand | null {
  return mutationToOfflineCommand(mutation);
}

/** @deprecated Prefer getCommandTransport().send — kept for transitional tests */
export async function mockSyncMutation(mutation: OutboxMutation): Promise<string> {
  const command = outboxMutationToCommand(mutation);
  if (!command) {
    mutateMockDuty(mutation);
    const payload = mutation.payload as { dutyId?: string };
    if (payload.dutyId) {
      const updated = getMockDutyDetail(payload.dutyId);
      if (updated) useDriverStore.getState().projectDuty(updated);
    }
    return `srv_${mutation.localOperationId}`;
  }
  const result = await new MockCommandTransport().send(command);
  if (result.status === "rejected") {
    throw new Error(
      result.reasonCode === "VERSION_CONFLICT" ? "Version conflict" : result.reasonCode,
    );
  }
  return `srv_${mutation.localOperationId}`;
}
