import { haversineMeters } from "@/lib/smoothGps";
import { formatUkTime } from "@/lib/uk-locale";

const METRES_PER_MILE = 1609.344;
const URBAN_MPH_TO_PICKUP = 25;
const URBAN_MPH_TRIP = 30;
export const DRIVER_EARNINGS_SHARE = 0.8;

export function formatPence(pence) {
  const amount = Number(pence);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `£${(amount / 100).toFixed(2)}`;
}

export function formatPenceOrPlaceholder(pence, placeholder = "Fare TBC") {
  return formatPence(pence) ?? placeholder;
}

export function resolveCustomerFarePence(booking) {
  if (!booking) return null;
  const candidates = [
    booking.farePence,
    booking.finalFarePence,
    booking.agreed_fare_pence,
    booking.final_fare_pence,
  ];
  for (const value of candidates) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount);
  }
  return null;
}

export function resolveDriverEarningsPence(booking) {
  const payout = Number(booking?.driverPayoutPence ?? booking?.driver_payout_pence);
  if (Number.isFinite(payout) && payout > 0) return Math.round(payout);

  const fare = resolveCustomerFarePence(booking);
  if (fare == null) return null;
  return Math.round(fare * DRIVER_EARNINGS_SHARE);
}

export function formatMilesFromMetres(metres) {
  const m = Number(metres);
  if (!Number.isFinite(m) || m <= 0) return null;
  const miles = m / METRES_PER_MILE;
  if (miles < 0.1) return "< 0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

export function formatMinutesFromSeconds(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return null;
  const mins = Math.max(1, Math.round(s / 60));
  return mins;
}

export function formatMinutesLabel(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return null;
  const rounded = Math.max(1, Math.round(m));
  return `${rounded} min${rounded === 1 ? "" : "s"}`;
}

/** Rough urban driving speed for ETA when no route duration is available. */
export function estimateMinutesFromMetres(metres, mph = URBAN_MPH_TRIP) {
  const m = Number(metres);
  if (!Number.isFinite(m) || m <= 0) return null;
  const hours = m / METRES_PER_MILE / mph;
  return Math.max(1, Math.round(hours * 60));
}

export function formatLegSummary(minutes, milesLabel) {
  const minutesLabel = formatMinutesLabel(minutes);
  const parts = [];
  if (minutesLabel) parts.push(minutesLabel);
  if (milesLabel) parts.push(`(${milesLabel})`);
  return parts.length ? parts.join(" ") : null;
}

export function formatLegClockEta(minutesFromNow) {
  const mins = Number(minutesFromNow);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + Math.round(mins));
  return formatUkTime(eta);
}

export function buildMatchedTripLegs({ driverLat, driverLng, pickup, dropoff, booking }) {
  const pickupCoords = readCoords(pickup) ?? readBookingCoords(booking, "pickup");
  const dropoffCoords = readCoords(dropoff) ?? readBookingCoords(booking, "dropoff");

  let toPickupMetres = null;
  if (pickupCoords && driverLat != null && driverLng != null) {
    toPickupMetres = haversineMeters(driverLat, driverLng, pickupCoords.lat, pickupCoords.lng);
  }

  let tripMetres = booking?.estimatedDistanceMeters ?? null;
  if (tripMetres == null && pickupCoords && dropoffCoords) {
    tripMetres = haversineMeters(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
  }

  const toPickupMinutes =
    toPickupMetres != null ? estimateMinutesFromMetres(toPickupMetres, URBAN_MPH_TO_PICKUP) : null;

  const tripMinutes =
    booking?.estimatedDurationSeconds != null
      ? formatMinutesFromSeconds(booking.estimatedDurationSeconds)
      : tripMetres != null
        ? estimateMinutesFromMetres(tripMetres, URBAN_MPH_TRIP)
        : null;

  const pickupMiles = formatMilesFromMetres(toPickupMetres);
  const tripMiles = formatMilesFromMetres(tripMetres);

  const dropoffMinutes =
    toPickupMinutes != null && tripMinutes != null ? toPickupMinutes + tripMinutes : tripMinutes;

  return {
    pickup: {
      address: booking?.pickupAddress ?? pickup?.label ?? pickup?.address ?? "Pickup",
      summary: formatLegSummary(toPickupMinutes, pickupMiles),
      eta: formatLegClockEta(toPickupMinutes),
      minutes: toPickupMinutes,
    },
    dropoff: {
      address: booking?.destinationAddress ?? dropoff?.label ?? dropoff?.address ?? "Destination",
      summary: formatLegSummary(tripMinutes, tripMiles),
      eta: formatLegClockEta(dropoffMinutes),
      minutes: dropoffMinutes,
    },
  };
}

export function resolveMatchedTripHeadline(trip, booking) {
  const pickup =
    booking?.pickupAddress ??
    trip?.pickup?.label ??
    trip?.stops?.find((s) => s.stopType === "pickup")?.label;
  if (pickup) return pickup;

  const route = trip?.routeName ?? "";
  const dashIdx = route.indexOf(" — ");
  if (dashIdx >= 0) return route.slice(dashIdx + 3).trim() || route;
  return route || "Trip";
}

export function resolveMatchedTripSubtitle(trip, booking) {
  return (
    booking?.destinationAddress ??
    trip?.dropoff?.label ??
    trip?.stops?.find((s) => s.stopType === "dropoff")?.label ??
    null
  );
}

function readCoords(json) {
  if (!json || typeof json !== "object") return null;
  const lat = Number(json.lat ?? json.latitude);
  const lng = Number(json.lng ?? json.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function readBookingCoords(booking, leg) {
  if (!booking) return null;
  if (leg === "pickup") {
    const lat = Number(booking.pickupLatitude);
    const lng = Number(booking.pickupLongitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  if (leg === "dropoff") {
    const lat = Number(booking.destinationLatitude);
    const lng = Number(booking.destinationLongitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

export const MATCHED_TRIP_ACTIVE_STATUSES = new Set([
  "assigned",
  "accepted",
  "planned",
  "ready_to_dispatch",
  "offered",
]);
