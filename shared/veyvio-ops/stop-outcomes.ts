/** Stop and passenger-leg outcomes for school / vulnerable transport. */

export type StopOperationalStatus =
  | "pending"
  | "en_route"
  | "arrived"
  | "servicing"
  | "completed"
  | "skipped"
  | "cancelled"
  | "unable_to_access";

export type PassengerPickupOutcome =
  | "boarded"
  | "not_ready"
  | "no_show"
  | "refused"
  | "cancelled"
  | "unreachable"
  | "unsafe_to_board"
  | "wrong_location"
  | "transport_not_required";

export type PassengerDropoffOutcome =
  | "handed_over"
  | "independent_drop_off"
  | "handover_delayed"
  | "authorised_person_absent"
  | "drop_off_refused"
  | "alternative_drop_off_authorised"
  | "safeguarding_escalation";

export interface StopOutcomeRecord {
  stopId: string;
  journeyId: string;
  status: StopOperationalStatus;
  recordedAt: string;
  recordedBy: string;
  overrideReason?: string;
}

export interface PassengerLegOutcome {
  passengerId: string;
  stopId: string;
  journeyId: string;
  type: "pickup" | "dropoff";
  pickupOutcome?: PassengerPickupOutcome;
  dropoffOutcome?: PassengerDropoffOutcome;
  recordedAt: string;
  recordedBy: string;
  notes?: string;
}

export const PICKUP_OUTCOME_LABELS: Record<PassengerPickupOutcome, string> = {
  boarded: "Boarded",
  not_ready: "Not ready",
  no_show: "No-show",
  refused: "Refused",
  cancelled: "Cancelled",
  unreachable: "Unreachable",
  unsafe_to_board: "Unsafe to board",
  wrong_location: "Wrong location",
  transport_not_required: "Transport not required",
};

export const DROPOFF_OUTCOME_LABELS: Record<PassengerDropoffOutcome, string> = {
  handed_over: "Handed over",
  independent_drop_off: "Independent drop-off",
  handover_delayed: "Handover delayed",
  authorised_person_absent: "Authorised person absent",
  drop_off_refused: "Drop-off refused",
  alternative_drop_off_authorised: "Alternative drop-off authorised",
  safeguarding_escalation: "Safeguarding escalation",
};

export function pickupRequiresReason(outcome: PassengerPickupOutcome): boolean {
  return outcome !== "boarded";
}

export function dropoffRequiresReason(outcome: PassengerDropoffOutcome): boolean {
  return outcome !== "handed_over" && outcome !== "independent_drop_off";
}

/** Passenger still preparing — stay on stop, not an Ops hold. */
export function pickupWaitingOnPassenger(outcome: PassengerPickupOutcome): boolean {
  return outcome === "not_ready";
}

/**
 * Serious pickup outcomes — stop waits for Operations; driver must not continue the route.
 */
export function pickupHoldsForOperations(outcome: PassengerPickupOutcome): boolean {
  return (
    outcome === "refused" ||
    outcome === "unreachable" ||
    outcome === "unsafe_to_board" ||
    outcome === "wrong_location"
  );
}

export function pickupAllowsRouteAdvance(outcome: PassengerPickupOutcome): boolean {
  return outcome === "boarded" || outcome === "no_show" || outcome === "transport_not_required" || outcome === "cancelled";
}

/**
 * Drop-off outcomes that must not treat the passenger as safely handed over / continue route.
 * `authorised_person_absent` must never count as a successful handover.
 */
export function dropoffHoldsForOperations(outcome: PassengerDropoffOutcome): boolean {
  return (
    outcome === "authorised_person_absent" ||
    outcome === "drop_off_refused" ||
    outcome === "safeguarding_escalation" ||
    outcome === "handover_delayed"
  );
}

export function dropoffAllowsRouteAdvance(outcome: PassengerDropoffOutcome): boolean {
  return outcome === "handed_over" || outcome === "independent_drop_off" || outcome === "alternative_drop_off_authorised";
}
