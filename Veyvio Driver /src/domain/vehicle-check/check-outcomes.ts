import type { CheckOutcome } from "@/types/vehicle-check";
import type { VehicleCheckOutcome } from "@veyvio/ops";

/** Map Driver check session outcomes to canonical ops outcomes. */
export function toOpsCheckOutcome(outcome: CheckOutcome): VehicleCheckOutcome {
  switch (outcome) {
    case "nil_defects":
      return "RELEASED_NO_DEFECTS";
    case "defect_awaiting_review":
      return "HELD_PENDING_REVIEW";
    case "safety_critical_blocked":
      return "VOR";
    case "offline_blocked":
      return "CHECK_SUBMISSION_PENDING_SYNC";
    default:
      return "HELD_PENDING_REVIEW";
  }
}

export function opsCheckOutcomeLabel(outcome: VehicleCheckOutcome): string {
  switch (outcome) {
    case "RELEASED_NO_DEFECTS":
      return "Released — no defects";
    case "RELEASED_WITH_ACCEPTED_DEFECTS":
      return "Released — accepted defects on file";
    case "HELD_PENDING_REVIEW":
      return "Held — pending review";
    case "VOR":
      return "VOR — do not drive";
    case "CHECK_SUBMISSION_PENDING_SYNC":
      return "Saved on device — awaiting sync";
    default:
      return outcome;
  }
}
