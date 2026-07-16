import type { OutboxMutationType } from "@/types/sync";

/** Operational labels for outbox mutation types (sync queue UI). */
export const MUTATION_LABELS: Record<OutboxMutationType, string> = {
  "vehicle.move": "Vehicle moved",
  "vehicle.mark_vor": "Vehicle marked VOR",
  "vehicle.release_vor": "Return to service",
  "vehicle.adblue_refill": "AdBlue refill recorded",
  "check.complete": "Yard check completed",
  "defect.create": "Defect raised",
  "defect.resolve": "Defect resolved",
  "equipment.assign": "Equipment assigned",
  "equipment.transfer": "Equipment transferred",
  "equipment.restock": "Equipment restocked",
  "departure.release": "Departure released",
  "task.update": "Task updated",
  "handover.complete": "Shift handover",
  "inspection.start": "Inspection started",
  "inspection.media": "Evidence captured",
  "inspection.complete": "Inspection completed",
  "inspection.approve": "Baseline approved",
  "damage.report": "Damage reported",
  "damage.review": "Damage reviewed",
  "repair.request": "Repair requested",
  "repair.start": "Repair started",
  "repair.complete": "Repair completed",
  "repair.verify": "Repair verified",
};

export function mutationLabel(type: OutboxMutationType | string): string {
  return MUTATION_LABELS[type as OutboxMutationType] ?? type.replace(/\./g, " ");
}

export const MUTATION_STATUS_LABELS = {
  pending: "Waiting to sync",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Sync failed",
  conflict: "Needs review",
} as const;
