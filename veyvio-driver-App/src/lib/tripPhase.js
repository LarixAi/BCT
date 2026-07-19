/**
 * Normalized operational phase for driver trips.
 *
 * "Accepted" is encoded as driver_assigned + driver_accept_time — not a booking_status.
 * Use these helpers everywhere instead of checking fields ad hoc.
 */
import { jobFlowStep } from "@/lib/jobFlow";

export const TRIP_PHASE = {
  OFFER: "offer",
  ACCEPTED: "accepted",
  EN_ROUTE: "en_route",
  ARRIVED: "arrived",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  OTHER: "other",
};

export function isTripOffer(booking) {
  return (
    booking?.booking_status === "driver_assigned" && !booking?.driver_accept_time
  );
}

export function isTripAcceptedNotStarted(booking) {
  return (
    booking?.booking_status === "driver_assigned" && Boolean(booking?.driver_accept_time)
  );
}

/** Operational phase used for map-home CTAs, navigation leg, and heartbeat. */
export function getOperationalPhase(booking) {
  if (!booking) return null;
  if (isTripOffer(booking)) return TRIP_PHASE.OFFER;
  if (isTripAcceptedNotStarted(booking)) return TRIP_PHASE.ACCEPTED;
  if (booking.booking_status === "en_route") return TRIP_PHASE.EN_ROUTE;
  if (booking.booking_status === "arrived") return TRIP_PHASE.ARRIVED;
  if (booking.booking_status === "in_progress") return TRIP_PHASE.IN_PROGRESS;
  if (booking.booking_status === "completed") return TRIP_PHASE.COMPLETED;
  if (booking.booking_status === "cancelled") return TRIP_PHASE.CANCELLED;
  return TRIP_PHASE.OTHER;
}

export function isActiveTripOnMap(booking) {
  const phase = getOperationalPhase(booking);
  return [
    TRIP_PHASE.ACCEPTED,
    TRIP_PHASE.EN_ROUTE,
    TRIP_PHASE.ARRIVED,
    TRIP_PHASE.IN_PROGRESS,
  ].includes(phase);
}

export function peekStatusForBooking(booking) {
  const phase = getOperationalPhase(booking);
  return {
    [TRIP_PHASE.ACCEPTED]: "Ready — start journey",
    [TRIP_PHASE.EN_ROUTE]: "En route to pickup",
    [TRIP_PHASE.ARRIVED]: "Waiting at pickup",
    [TRIP_PHASE.IN_PROGRESS]: "Trip in progress",
  }[phase] || "Active trip";
}

export function nextJobAction(booking) {
  return jobFlowStep(booking?.booking_status)?.action || null;
}
