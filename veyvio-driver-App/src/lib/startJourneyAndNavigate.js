/**
 * Closes the accept → en_route dead zone: advance job status, then open Google Maps.
 */
import { advanceJobStep } from "@/lib/jobFlow";
import { openGoogleNavigation } from "@/lib/googleNavLauncher";
import { getOperationalPhase, TRIP_PHASE } from "@/lib/tripPhase";
import { fetchBookingById } from "@/lib/fetchEntity";

/**
 * If trip is accepted-but-not-started, advance to en_route first, then navigate.
 * If already en_route / in_progress, navigate only.
 */
export async function startJourneyAndNavigate({
  booking,
  driver,
  driverLat,
  driverLng,
  onBookingUpdate,
}) {
  const phase = getOperationalPhase(booking);
  let working = booking;

  if (phase === TRIP_PHASE.ACCEPTED) {
    const result = await advanceJobStep({ booking, driver });
    if (result.error) {
      throw new Error(result.error);
    }
    working = result.booking;

    if (working.booking_status !== "en_route") {
      try {
        const fresh = await fetchBookingById(booking.id, { timeoutMs: 8000 });
        if (fresh?.booking_status === "en_route") {
          working = { ...working, ...fresh };
        }
      } catch {
        /* use advance result */
      }
    }

    if (working.booking_status !== "en_route") {
      throw new Error("Could not start journey — trip status did not update. Try again.");
    }

    onBookingUpdate?.(working);
  }

  await openGoogleNavigation({
    booking: working,
    driver,
    driverLat,
    driverLng,
    showToast: true,
  });

  return working;
}

/** Advance one job step without opening Maps (arrived, complete, etc.). */
export async function advanceTripStep({ booking, driver, onBookingUpdate }) {
  const result = await advanceJobStep({ booking, driver });
  if (result.error) {
    throw new Error(result.error);
  }
  onBookingUpdate?.(result.booking);
  return result.booking;
}
