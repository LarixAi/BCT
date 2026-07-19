/** PHV customer-booking trip card helpers for driver home + jobs hub. */

const PHV_ACTIVE_STATUSES = new Set([
  "assigned",
  "accepted",
  "en_route",
  "en_route_to_pickup",
  "arrived_at_pickup",
  "passenger_boarding",
  "in_progress",
]);

export function isPhvCustomerBookingJob(job) {
  return Boolean(job?.customerBookingId ?? job?.customer_booking_id);
}

export function getPhvTripStatusHint(status, isPhv = true) {
  if (!isPhv) return null;

  switch (status) {
    case "assigned":
    case "accepted":
      return "Private hire trip — open when ready to start";
    case "en_route":
    case "en_route_to_pickup":
      return "En route to pickup";
    case "arrived_at_pickup":
      return "Ask passenger for their 4-digit pickup PIN";
    case "passenger_boarding":
      return "Enter pickup PIN to board passenger";
    case "in_progress":
      return "Trip in progress";
    default:
      return PHV_ACTIVE_STATUSES.has(status) ? "Private hire trip" : null;
  }
}

export function enrichJobForPhvCard(job) {
  const isPhv = isPhvCustomerBookingJob(job);
  return {
    ...job,
    isPhvCustomerBooking: isPhv,
    phvStatusHint: getPhvTripStatusHint(job?.status, isPhv),
  };
}
