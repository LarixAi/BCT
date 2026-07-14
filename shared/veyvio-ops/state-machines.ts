import type {
  DutyLifecycleStatus,
  JourneyLifecycleStatus,
  VehicleUseSessionStatus,
} from "./types";

const DUTY_TRANSITIONS: Record<DutyLifecycleStatus, DutyLifecycleStatus[]> = {
  assigned: ["delivered", "cancelled", "blocked"],
  delivered: ["acknowledged", "cancelled", "blocked"],
  acknowledged: ["clocked_in", "cancelled", "blocked", "suspended"],
  clocked_in: ["active", "cancelled", "blocked", "suspended"],
  active: ["close_required", "cancelled", "transferred", "suspended", "blocked"],
  close_required: ["completed", "cancelled", "blocked"],
  completed: [],
  blocked: ["delivered", "acknowledged", "cancelled"],
  cancelled: [],
  transferred: ["completed", "cancelled"],
  suspended: ["acknowledged", "clocked_in", "active", "cancelled"],
};

const JOURNEY_TRANSITIONS: Record<JourneyLifecycleStatus, JourneyLifecycleStatus[]> = {
  scheduled: ["released", "cancelled"],
  released: ["ready", "cancelled"],
  ready: ["in_progress", "cancelled"],
  in_progress: ["completed", "aborted", "transferred", "partially_completed", "cancelled"],
  completed: [],
  cancelled: [],
  aborted: [],
  transferred: ["completed", "cancelled"],
  partially_completed: ["completed", "cancelled"],
};

const VEHICLE_USE_TRANSITIONS: Record<VehicleUseSessionStatus, VehicleUseSessionStatus[]> = {
  assigned: ["accepted", "swap_required"],
  accepted: ["verified", "swap_required"],
  verified: ["checking", "held", "VOR"],
  checking: ["released", "held", "VOR"],
  released: ["in_use", "held", "VOR", "swap_required"],
  in_use: ["handback_required", "held", "VOR", "swap_required"],
  handback_required: ["returned", "held", "VOR"],
  returned: [],
  held: ["checking", "released", "VOR", "swap_required"],
  VOR: [],
  swap_required: ["assigned", "accepted"],
};

export function canTransitionDuty(from: DutyLifecycleStatus, to: DutyLifecycleStatus): boolean {
  return DUTY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertDutyTransition(from: DutyLifecycleStatus, to: DutyLifecycleStatus): void {
  if (!canTransitionDuty(from, to)) {
    throw new Error(`Invalid duty transition: ${from} → ${to}`);
  }
}

export function canTransitionJourney(
  from: JourneyLifecycleStatus,
  to: JourneyLifecycleStatus,
): boolean {
  return JOURNEY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertJourneyTransition(
  from: JourneyLifecycleStatus,
  to: JourneyLifecycleStatus,
): void {
  if (!canTransitionJourney(from, to)) {
    throw new Error(`Invalid journey transition: ${from} → ${to}`);
  }
}

export function canTransitionVehicleUse(
  from: VehicleUseSessionStatus,
  to: VehicleUseSessionStatus,
): boolean {
  return VEHICLE_USE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertVehicleUseTransition(
  from: VehicleUseSessionStatus,
  to: VehicleUseSessionStatus,
): void {
  if (!canTransitionVehicleUse(from, to)) {
    throw new Error(`Invalid vehicle-use transition: ${from} → ${to}`);
  }
}

/** Map legacy Driver duty statuses onto canonical ops statuses. */
export function toCanonicalDutyStatus(
  legacy:
    | "published"
    | "delivered"
    | "viewed"
    | "acknowledged"
    | "declined"
    | "ready"
    | "in_progress"
    | "completed"
    | "cancelled",
): DutyLifecycleStatus {
  switch (legacy) {
    case "published":
      return "assigned";
    case "delivered":
    case "viewed":
      return "delivered";
    case "acknowledged":
    case "ready":
      return "acknowledged";
    case "declined":
      return "cancelled";
    case "in_progress":
      return "active";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "assigned";
  }
}

/** Legacy → whether duty is treated as clocked in / active for journey start. */
export function legacyDutyAllowsJourneyStart(
  legacy:
    | "published"
    | "delivered"
    | "viewed"
    | "acknowledged"
    | "declined"
    | "ready"
    | "in_progress"
    | "completed"
    | "cancelled",
  clockedIn: boolean,
): boolean {
  if (legacy === "in_progress") return true;
  if ((legacy === "ready" || legacy === "acknowledged") && clockedIn) return true;
  return false;
}
