import type { OutboxMutationType } from "@/types/sync";
import type { YardPermission } from "@/types/permissions";

export type YardMutationCommandStatus = "supported";

export interface YardMutationInventoryEntry {
  type: OutboxMutationType;
  commandStatus: YardMutationCommandStatus;
  /** Permission enforced on POST /yard/mutations when supported. */
  permission: YardPermission | null;
}

/**
 * Gate 1 command inventory (P0-02) — every outbox mutation type mapped to Command support.
 * Server handlers: `applyYardMutationRoute`, `applyBodyConditionYardMutation`, `yard-mutation-handlers.ts`.
 */
export const YARD_MUTATION_INVENTORY: readonly YardMutationInventoryEntry[] = [
  { type: "vehicle.move", commandStatus: "supported", permission: "vehicle.move" },
  { type: "vehicle.mark_vor", commandStatus: "supported", permission: "vehicle.mark_vor" },
  { type: "vehicle.release_vor", commandStatus: "supported", permission: "vehicle.release_vor" },
  { type: "vehicle.adblue_refill", commandStatus: "supported", permission: null },
  { type: "check.complete", commandStatus: "supported", permission: "check.complete" },
  { type: "defect.create", commandStatus: "supported", permission: "incident.create" },
  { type: "defect.resolve", commandStatus: "supported", permission: "defect.resolve" },
  { type: "equipment.assign", commandStatus: "supported", permission: "equipment.assign" },
  { type: "equipment.transfer", commandStatus: "supported", permission: "equipment.transfer" },
  { type: "equipment.restock", commandStatus: "supported", permission: "equipment.assign" },
  { type: "departure.release", commandStatus: "supported", permission: "plan.acknowledge" },
  { type: "departure.complete", commandStatus: "supported", permission: "plan.acknowledge" },
  { type: "plan.acknowledge", commandStatus: "supported", permission: "plan.acknowledge" },
  { type: "task.create", commandStatus: "supported", permission: "task.assign" },
  { type: "task.update", commandStatus: "supported", permission: "task.assign" },
  { type: "handover.complete", commandStatus: "supported", permission: "handover.complete" },
  { type: "inspection.start", commandStatus: "supported", permission: "check.complete" },
  { type: "inspection.media", commandStatus: "supported", permission: "check.complete" },
  { type: "inspection.complete", commandStatus: "supported", permission: "check.complete" },
  { type: "inspection.approve", commandStatus: "supported", permission: "check.override" },
  { type: "damage.report", commandStatus: "supported", permission: "incident.create" },
  { type: "damage.review", commandStatus: "supported", permission: "defect.resolve" },
  { type: "repair.request", commandStatus: "supported", permission: "defect.resolve" },
  { type: "repair.start", commandStatus: "supported", permission: "defect.resolve" },
  { type: "repair.complete", commandStatus: "supported", permission: "defect.resolve" },
  { type: "repair.verify", commandStatus: "supported", permission: "defect.resolve" },
] as const;

const INVENTORY_BY_TYPE = new Map(
  YARD_MUTATION_INVENTORY.map((entry) => [entry.type, entry] as const),
);

export class UnsupportedYardMutationError extends Error {
  readonly mutationType: OutboxMutationType;

  constructor(mutationType: OutboxMutationType) {
    super(
      `This yard action is not on Command yet (${mutationType}). It was saved on this device only.`,
    );
    this.name = "UnsupportedYardMutationError";
    this.mutationType = mutationType;
  }
}

export function yardMutationInventoryEntry(
  type: OutboxMutationType,
): YardMutationInventoryEntry | undefined {
  return INVENTORY_BY_TYPE.get(type);
}

export function isCommandSupportedYardMutation(type: OutboxMutationType): boolean {
  return INVENTORY_BY_TYPE.has(type);
}

export function commandSupportedYardMutationTypes(): OutboxMutationType[] {
  return YARD_MUTATION_INVENTORY.map((e) => e.type);
}

/** Fail closed when live Command is configured — no mock fallback for unknown types. */
export function assertYardMutationCommandSupported(type: OutboxMutationType): void {
  if (!isCommandSupportedYardMutation(type)) {
    throw new UnsupportedYardMutationError(type);
  }
}
