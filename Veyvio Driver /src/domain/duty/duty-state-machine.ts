import type { DutyDetail, DutyLifecycleStatus } from "@/types/duty";
import type { DriverEligibilityDecision } from "@veyvio/ops";
import { eligibilityAllowsWork, eligibilityBlockedReason } from "@veyvio/ops";

const DUTY_TRANSITIONS: Record<DutyLifecycleStatus, DutyLifecycleStatus[]> = {
  published: ["delivered", "cancelled"],
  delivered: ["viewed", "cancelled"],
  viewed: ["acknowledged", "declined", "cancelled"],
  acknowledged: ["ready", "cancelled"],
  declined: ["cancelled"],
  ready: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionDuty(from: DutyLifecycleStatus, to: DutyLifecycleStatus): boolean {
  return DUTY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertDutyTransition(from: DutyLifecycleStatus, to: DutyLifecycleStatus): void {
  if (!canTransitionDuty(from, to)) {
    throw new Error(`Invalid duty transition: ${from} → ${to}`);
  }
}

/**
 * @deprecated Do not use to fake a duty start from open-journey.
 * Journey start must never walk duty lifecycle forward.
 */
export function advanceDutyLifecycleForStart(status: DutyLifecycleStatus): DutyLifecycleStatus {
  if (status === "in_progress" || status === "completed" || status === "cancelled") {
    return status;
  }

  const path: DutyLifecycleStatus[] = ["published", "delivered", "viewed", "acknowledged", "ready"];
  let current = status;

  while (current !== "ready") {
    const idx = path.indexOf(current);
    if (idx === -1 || idx >= path.length - 1) break;
    const next = path[idx + 1];
    if (!canTransitionDuty(current, next)) break;
    current = next;
  }

  return current;
}

/** Clock in / fit-for-duty — does not start a journey. */
export function canClockInDuty(input: {
  lifecycleStatus: DutyLifecycleStatus;
  vehicleVerified: boolean;
  vehicleCheckCanStart: boolean;
  eligibility: DriverEligibilityDecision;
  alreadyClockedIn: boolean;
}): { allowed: boolean; reason?: string } {
  if (input.alreadyClockedIn) {
    return { allowed: false, reason: "You are already clocked into this duty." };
  }
  if (!eligibilityAllowsWork(input.eligibility)) {
    return {
      allowed: false,
      reason:
        eligibilityBlockedReason(input.eligibility) ??
        "You cannot start this duty. Operations has been notified.",
    };
  }
  if (!input.vehicleVerified) {
    return { allowed: false, reason: "Confirm the vehicle assignment before clocking in." };
  }
  if (!input.vehicleCheckCanStart) {
    return {
      allowed: false,
      reason: "Complete the vehicle check for this assigned vehicle before clocking in.",
    };
  }
  if (input.lifecycleStatus !== "ready" && input.lifecycleStatus !== "acknowledged") {
    return { allowed: false, reason: "Acknowledge this duty before clocking in." };
  }
  return { allowed: true };
}

/** @deprecated Prefer canClockInDuty — name kept for existing call sites during migration. */
export function canStartDuty(input: {
  lifecycleStatus: DutyLifecycleStatus;
  vehicleVerified: boolean;
  vehicleCheckCanStart: boolean;
  eligibility: DriverEligibilityDecision;
}): { allowed: boolean; reason?: string } {
  return canClockInDuty({ ...input, alreadyClockedIn: false });
}

const OPEN_PASSENGER_TASK = new Set(["scheduled", "not_ready", "boarded"]);

/**
 * Duty completion gate — do not offer Complete duty until these pass.
 * Server should enforce the same rules; this is the client gate.
 */
export function canCompleteDuty(duty: DutyDetail): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];

  if (duty.lifecycleStatus !== "in_progress") {
    blockers.push("Duty is not in progress.");
  }

  const incompleteJourneys = duty.runs.filter((r) => r.status !== "completed");
  if (incompleteJourneys.length > 0) {
    blockers.push(
      incompleteJourneys.length === 1
        ? "One journey is still incomplete."
        : `${incompleteJourneys.length} journeys are still incomplete.`,
    );
  }

  if (duty.runs.some((r) => r.stops.some((s) => s.status === "waiting_for_operations"))) {
    blockers.push("A stop is waiting for Operations before the duty can finish.");
  }

  const openTasks = duty.runs.flatMap((r) =>
    r.stops.flatMap((s) => s.passengerTasks.filter((t) => OPEN_PASSENGER_TASK.has(t.status))),
  );
  if (incompleteJourneys.length === 0 && openTasks.length > 0) {
    blockers.push("A passenger task still needs a final safe outcome.");
  }

  if (!duty.vehicleHandback?.completedAt) {
    blockers.push("Vehicle handback has not been completed.");
  }

  // Clock-out: when a dedicated duty.clock_out command lands, require clockedOutAt here.
  // Until then, duty.complete records completion time as end of work.

  return { allowed: blockers.length === 0, blockers };
}

/** Start a journey only after clock-in. Never advances duty lifecycle by itself. */
export function canStartJourneyForDuty(input: {
  lifecycleStatus: DutyLifecycleStatus;
  clockedInAt?: string;
  vehicleCheckCanStart: boolean;
}): { allowed: boolean; reason?: string } {
  if (!input.clockedInAt) {
    return { allowed: false, reason: "Clock into the duty before starting a journey." };
  }
  if (!input.vehicleCheckCanStart) {
    return {
      allowed: false,
      reason: "This vehicle is not released for use. Complete or resume the vehicle check.",
    };
  }
  if (
    input.lifecycleStatus !== "ready" &&
    input.lifecycleStatus !== "acknowledged" &&
    input.lifecycleStatus !== "in_progress"
  ) {
    return { allowed: false, reason: "This duty is not active for journey work." };
  }
  return { allowed: true };
}
