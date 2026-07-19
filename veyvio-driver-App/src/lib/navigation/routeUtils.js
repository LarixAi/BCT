import { getDistanceMeters } from "@/utils/navigationUtils";

export const ARRIVAL_DISTANCE_METERS = 45;
/** 8 mph in m/s */
export const ARRIVAL_MAX_SPEED_MPS = 8 * 0.44704;
export const ARRIVAL_MAX_ACCURACY_METERS = 50;

/**
 * Off-route distance threshold (perpendicular metres from the route polyline).
 *
 * Used as the *safety upper bound* fallback when the location engine's
 * hysteresis-based off-route detector hasn't fired. The engine handles the
 * primary "should we reroute" decision via 3-strike consecutive readings.
 */
export const OFF_ROUTE_DISTANCE_METERS = 40;

/**
 * Hard upper bound between reroute API calls — protects Google Routes quota
 * from accidental hammering even if the engine flips state quickly.
 */
export const REROUTE_INTERVAL_MS = 30000;

export function computeCanArrive({ distanceMeters, speed, accuracy }) {
  if (distanceMeters == null || distanceMeters > ARRIVAL_DISTANCE_METERS) return false;
  if (accuracy != null && accuracy > ARRIVAL_MAX_ACCURACY_METERS) return false;
  if (speed != null && speed > ARRIVAL_MAX_SPEED_MPS) return false;
  return true;
}

export function buildFallbackInstruction({ routeSteps, destinationLabel }) {
  const fromStep = routeSteps?.[0]?.navigationInstruction?.instructions;
  if (fromStep) return fromStep;
  if (destinationLabel) return `Continue to ${destinationLabel}`;
  return "Continue to your next stop";
}

/**
 * @deprecated Prefer the engine's `offRoute` state from
 * `useNavigationLocationEngine`, which uses the route polyline (not the
 * current step's end point) and applies hysteresis.
 *
 * Retained for back-compat; measures distance to the nearest step's end —
 * close enough as a coarse safety check when the engine isn't available.
 */
export function isOffRoute(driverLocation, currentStep, thresholdM = OFF_ROUTE_DISTANCE_METERS) {
  const end = currentStep?.endLocation?.latLng;
  if (!driverLocation || !end) return false;
  const distance = getDistanceMeters(driverLocation, {
    latitude: end.latitude,
    longitude: end.longitude,
  });
  return distance > thresholdM;
}
