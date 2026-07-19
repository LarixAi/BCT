/**
 * Shared trip companion payload for floating bubble (Phase 1) and
 * CarPlay / Android Auto (Phase 2).
 *
 * @typedef {"pickup"|"dropoff"} TripLeg
 * @typedef {"open_app"|"arrive"|"complete_stop"} TripPrimaryAction
 *
 * @typedef {Object} ActiveTripCompanion
 * @property {string} jobId
 * @property {string|null} jobRoute
 * @property {TripLeg} leg
 * @property {TripPrimaryAction} primaryAction
 * @property {string} label
 * @property {number} destinationLat
 * @property {number} destinationLng
 */

/** @returns {ActiveTripCompanion|null} */
export function buildActiveTripCompanion({ jobId, jobRoute, leg, destination, primaryAction = "open_app" }) {
  if (!jobId || !destination?.latitude || !destination?.longitude) return null;

  return {
    jobId,
    jobRoute: jobRoute ?? `/job/${jobId}`,
    leg: leg === "dropoff" ? "dropoff" : "pickup",
    primaryAction,
    label: destination.label ?? (leg === "dropoff" ? "Drop-off" : "Pickup"),
    destinationLat: destination.latitude,
    destinationLng: destination.longitude,
  };
}
