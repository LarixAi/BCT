import type { OutboxMutationType } from "@/types/sync";

const BODY_CONDITION_MUTATION_TYPES = new Set<OutboxMutationType>([
  "inspection.start",
  "inspection.media",
  "inspection.complete",
  "inspection.approve",
  "damage.report",
  "damage.review",
  "repair.request",
  "repair.start",
  "repair.complete",
  "repair.verify",
  "vehicle.mark_vor",
]);

export function isBodyConditionMutationType(type: OutboxMutationType): boolean {
  return BODY_CONDITION_MUTATION_TYPES.has(type);
}
