/**
 * Keep map-home active trip stable across optimistic updates and stale server polls.
 */
import { isActiveTripOnMap } from "@/lib/tripPhase";

const STATUS_RANK = {
  driver_assigned: 0,
  en_route: 1,
  arrived: 2,
  in_progress: 3,
  completed: 4,
};

const TERMINAL = new Set(["searching", "cancelled", "completed"]);

export function isActiveDriverBooking(booking) {
  return isActiveTripOnMap(booking);
}

export function findActiveDriverBooking(bookings = []) {
  return bookings.find(isActiveDriverBooking) || null;
}

function statusRank(status) {
  return STATUS_RANK[status] ?? -1;
}

/** Merge local + server rows for the same booking — never downgrade status. */
export function mergeBookingProgress(local, server) {
  if (!local) return server || null;
  if (!server || local.id !== server.id) return local;

  const merged = { ...server, ...local };
  const localRank = statusRank(local.booking_status);
  const serverRank = statusRank(server.booking_status);

  merged.booking_status =
    serverRank >= localRank ? server.booking_status : local.booking_status;

  merged.driver_accept_time =
    server.driver_accept_time || local.driver_accept_time || null;

  for (const field of [
    "dispatch_time",
    "arrival_time",
    "pickup_time",
    "completion_time",
  ]) {
    merged[field] = server[field] || local[field] || null;
  }

  return merged;
}

/**
 * Pick active trip for the dashboard — do not drop an in-progress local trip on a stale poll.
 */
export function reconcileActiveBooking(prev, bookings = []) {
  const serverActive = findActiveDriverBooking(bookings);
  const serverRow = prev ? bookings.find((b) => b.id === prev.id) : null;

  if (serverRow && TERMINAL.has(serverRow.booking_status)) {
    return null;
  }

  if (serverActive) {
    if (prev?.id === serverActive.id) {
      return mergeBookingProgress(prev, serverActive);
    }
    return serverActive;
  }

  if (!prev || !isActiveDriverBooking(prev)) {
    return null;
  }

  // Server list missing accept_time or en_route yet — keep optimistic trip
  if (serverRow) {
    return mergeBookingProgress(prev, serverRow);
  }

  return prev;
}
