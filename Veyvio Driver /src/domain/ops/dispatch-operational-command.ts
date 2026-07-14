/**
 * Dispatch path for operational commands.
 * Screens call this instead of patching duty entities.
 */
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import type { OutboxMutationType } from "@/types/sync";

export type DriverCommandType = OutboxMutationType;

export interface DriverCommand {
  type: DriverCommandType;
  payload: unknown;
  idempotencyKey?: string;
}

/**
 * Canonical client write path:
 * validate (caller) → optimistic project (optional) → outbox → transport → reconcile.
 */
export async function dispatchOperationalCommand(command: DriverCommand): Promise<void> {
  await enqueueDriverMutation(command.type, command.payload, command.idempotencyKey);
}
