import type { OfflineCommand } from "./types";
import type { PlatformEvent } from "./events";

/**
 * Domain events returned by the transport after a command is accepted.
 * Alias of PlatformEvent — same cross-app bus Driver / Admin / Yard share.
 */
export type DomainEvent = PlatformEvent;

/**
 * Shared contract for mock and HTTP outbox drain.
 * An outbox is only meaningful if both transports satisfy this interface.
 */
export interface CommandTransport {
  send(command: OfflineCommand): Promise<CommandResult>;
}

export type CommandResult =
  | {
      status: "accepted";
      commandId: string;
      aggregateId: string;
      serverVersion: number;
      events: DomainEvent[];
    }
  | {
      status: "rejected";
      commandId: string;
      reasonCode: string;
      currentVersion?: number;
      serverProjection?: unknown;
    };

/** Optimistic UI / projection status for a command still in the outbox. */
export type CommandLifecycleStatus = "pending" | "confirmed" | "rejected";

export function isCommandAccepted(
  result: CommandResult,
): result is Extract<CommandResult, { status: "accepted" }> {
  return result.status === "accepted";
}

export function isCommandRejected(
  result: CommandResult,
): result is Extract<CommandResult, { status: "rejected" }> {
  return result.status === "rejected";
}
