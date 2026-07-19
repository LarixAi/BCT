export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "failed" | "conflict";

export type OutboxMutationStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export type OutboxMutationType =
  | "vehicle.move"
  | "vehicle.mark_vor"
  | "vehicle.release_vor"
  | "vehicle.adblue_refill"
  | "check.complete"
  | "defect.create"
  | "defect.resolve"
  | "equipment.assign"
  | "equipment.transfer"
  | "equipment.restock"
  | "departure.release"
  | "departure.complete"
  | "task.update"
  | "handover.complete"
  | "inspection.start"
  | "inspection.media"
  | "inspection.complete"
  | "inspection.approve"
  | "damage.report"
  | "damage.review"
  | "repair.request"
  | "repair.start"
  | "repair.complete"
  | "repair.verify";

export interface OutboxMutation {
  localOperationId: string;
  type: OutboxMutationType;
  companyId: string;
  depotId: string;
  userId: string;
  deviceId: string;
  createdAt: string;
  payload: unknown;
  status: OutboxMutationStatus;
  serverId?: string;
  error?: string;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  failedCount: number;
}
