import type { OutboxMutationType } from "@/types/sync";

/**
 * Conflict handling policy for offline outbox replay.
 * Server wins for authoritative records; local wins for in-progress drafts only when timestamp is newer.
 */
export const CONFLICT_RETRY_TYPES = new Set<OutboxMutationType>([
  "vehicle.move",
  "task.update",
  "equipment.assign",
  "equipment.transfer",
]);

export function isRetryableConflict(type: OutboxMutationType): boolean {
  return CONFLICT_RETRY_TYPES.has(type);
}

export function conflictMessage(type: OutboxMutationType): string {
  switch (type) {
    case "damage.review":
      return "Damage review conflict — another manager may have already decided this report. Open Sync queue to review.";
    case "vehicle.mark_vor":
    case "vehicle.release_vor":
      return "VOR status changed on the server. Refresh the vehicle record before trying again.";
    case "check.complete":
      return "A newer check exists on the server. Review the vehicle check history.";
    default:
      return "This update could not be applied. Open Sync queue to retry or contact support.";
  }
}
