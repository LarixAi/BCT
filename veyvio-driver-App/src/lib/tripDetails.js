import { vehicleTypeLabel } from "@/lib/tripOfferStats";
import { bookingGross, bookingNet, DRIVER_NET_SHARE } from "@/lib/driverStats";

function haversineMi(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 0.621371;
}

function secondsBetween(start, end) {
  if (!start || !end) return null;
  const sec = Math.floor((new Date(end) - new Date(start)) / 1000);
  return sec > 0 ? sec : null;
}

export function parseFareBreakdown(booking) {
  if (!booking?.fare_breakdown) return null;
  try {
    return typeof booking.fare_breakdown === "string"
      ? JSON.parse(booking.fare_breakdown)
      : booking.fare_breakdown;
  } catch {
    return null;
  }
}

export function estimatedMinutesFromBreakdown(booking) {
  const breakdown = parseFareBreakdown(booking);
  const mins = breakdown?.est_minutes ?? breakdown?.est_mins;
  return mins != null ? Number(mins) : null;
}

export function tripDistanceMiles(booking, routeMeta = null) {
  if (routeMeta?.distanceMi != null) return routeMeta.distanceMi;

  const breakdown = parseFareBreakdown(booking);
  if (breakdown?.est_miles != null) return Number(breakdown.est_miles);

  const mi = haversineMi(booking.pickup_lat, booking.pickup_lng, booking.dropoff_lat, booking.dropoff_lng);
  return mi != null ? mi : null;
}

/** Best available trip duration in seconds. */
export function tripDurationSeconds(booking, routeMeta = null) {
  const inTrip = secondsBetween(booking.pickup_time, booking.completion_time);
  if (inTrip != null && inTrip >= 60) return inTrip;

  const dispatched = secondsBetween(booking.dispatch_time, booking.completion_time);
  if (dispatched != null && dispatched >= 60) return dispatched;

  const accepted = secondsBetween(booking.driver_accept_time, booking.completion_time);
  if (accepted != null && accepted >= 60) return accepted;

  const estMins = estimatedMinutesFromBreakdown(booking);
  if (estMins != null && estMins > 0) return Math.round(estMins * 60);

  if (routeMeta?.durationSec != null && routeMeta.durationSec > 0) {
    return routeMeta.durationSec;
  }

  const mi = tripDistanceMiles(booking, routeMeta);
  if (mi != null) return Math.max(60, Math.round((mi / 25) * 3600));

  if (inTrip != null) return inTrip;
  if (dispatched != null) return dispatched;
  return null;
}

export function formatTripDuration(booking, routeMeta = null) {
  const sec = tripDurationSeconds(booking, routeMeta);
  if (sec == null) return "—";
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins} min(s) ${secs} sec(s)`;
}

export function tripServiceLabel(booking) {
  return vehicleTypeLabel(booking.vehicle_type_requested);
}

export function tripPointsEarned(booking) {
  if (booking.booking_status !== "completed") return 0;
  return 1;
}

export function tripEarningsSummary(booking) {
  const gross = bookingGross(booking);
  const net = bookingNet(booking);
  const fee = gross - net;
  const feePct = Math.round((1 - DRIVER_NET_SHARE) * 100);
  return { gross, net, fee, feePct };
}

export function tripDisplayDate(booking) {
  return booking.completion_time || booking.pickup_time || booking.created_date || null;
}

export function paymentStatusLabel(booking) {
  if (booking.booking_status === "cancelled") return "Cancelled";
  if (booking.payment_status === "captured") return "Paid";
  if (booking.payment_status === "pending") return "Pending";
  return booking.payment_status || "—";
}
