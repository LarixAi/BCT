/** Fired when job stops change so navigation can recalculate. */
export const DRIVER_STOP_ITINERARY_CHANGED = "driver-stop-itinerary-changed";

export function notifyStopItineraryChanged(jobId) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DRIVER_STOP_ITINERARY_CHANGED, { detail: { jobId } }));
  }
}

/**
 * Hard rule: drivers cannot edit published job stops.
 * Itinerary changes are Command-owned only (one operational truth).
 */
export async function submitDriverStopChange(_jobId, _change) {
  return {
    ok: false,
    code: "driver_itinerary_edit_blocked",
    message:
      "You cannot change stops from the Driver app. Ask your operator to update the route in Command.",
  };
}
