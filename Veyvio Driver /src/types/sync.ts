export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "failed" | "conflict";

export type OutboxMutationStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export type OutboxMutationType =
  | "duty.acknowledge"
  | "duty.clock_in"
  | "duty.start"
  | "duty.complete"
  | "vehicle.verify"
  | "vehicle.check.submit"
  | "vehicle.handback"
  | "journey.start"
  | "journey.complete"
  | "stop.arrive"
  | "passenger.outcome"
  | "incident.report"
  | "defect.report";

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
  idempotencyKey?: string;
  /** Canonical offline command envelope fields */
  commandId?: string;
  aggregateId?: string;
  expectedVersion?: number;
  correlationId?: string;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  failedCount: number;
}
