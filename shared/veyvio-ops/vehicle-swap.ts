/** Controlled vehicle-swap orchestration — not a one-tap complete. */

export type VehicleSwapStatus =
  | "requested"
  | "awaiting_ops"
  | "replacement_identified"
  | "approved"
  | "paused"
  | "old_vehicle_closed"
  | "replacement_verifying"
  | "replacement_checking"
  | "resumed"
  | "cancelled"
  | "rejected";

export interface VehicleSwapRequest {
  id: string;
  dutyId: string;
  journeyId: string;
  fromVehicleId: string;
  fromRegistration: string;
  reason: string;
  currentSafetyStatus: string;
  status: VehicleSwapStatus;
  requestedAt: string;
  requestedBy: string;
  replacementVehicleId?: string;
  replacementRegistration?: string;
  assignmentVersion?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  accessibilityValidated?: boolean;
  capacityValidated?: boolean;
}

export function createSwapRequest(input: {
  dutyId: string;
  journeyId: string;
  fromVehicleId: string;
  fromRegistration: string;
  reason: string;
  currentSafetyStatus: string;
  requestedBy: string;
}): VehicleSwapRequest {
  return {
    id: `swap_${crypto.randomUUID?.() ?? Date.now()}`,
    dutyId: input.dutyId,
    journeyId: input.journeyId,
    fromVehicleId: input.fromVehicleId,
    fromRegistration: input.fromRegistration,
    reason: input.reason,
    currentSafetyStatus: input.currentSafetyStatus,
    status: "requested",
    requestedAt: new Date().toISOString(),
    requestedBy: input.requestedBy,
  };
}

const SWAP_TRANSITIONS: Record<VehicleSwapStatus, VehicleSwapStatus[]> = {
  requested: ["awaiting_ops", "cancelled"],
  awaiting_ops: ["replacement_identified", "rejected", "cancelled"],
  replacement_identified: ["approved", "rejected", "cancelled"],
  approved: ["paused"],
  paused: ["old_vehicle_closed"],
  old_vehicle_closed: ["replacement_verifying"],
  replacement_verifying: ["replacement_checking"],
  replacement_checking: ["resumed"],
  resumed: [],
  cancelled: [],
  rejected: [],
};

export function canAdvanceSwap(from: VehicleSwapStatus, to: VehicleSwapStatus): boolean {
  return SWAP_TRANSITIONS[from]?.includes(to) ?? false;
}

export function advanceSwap(
  request: VehicleSwapRequest,
  to: VehicleSwapStatus,
  patch?: Partial<VehicleSwapRequest>,
): VehicleSwapRequest {
  if (!canAdvanceSwap(request.status, to)) {
    throw new Error(`Invalid swap transition: ${request.status} → ${to}`);
  }
  return { ...request, ...patch, status: to };
}

/** Completing a swap requires verification + check on replacement — never a single button. */
export function swapCanResumeJourney(request: VehicleSwapRequest): boolean {
  return (
    request.status === "resumed" &&
    Boolean(request.replacementVehicleId) &&
    Boolean(request.assignmentVersion) &&
    request.accessibilityValidated === true &&
    request.capacityValidated === true
  );
}
