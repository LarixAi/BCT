/**
 * Off-route detection with hysteresis.
 *
 * Per the research report:
 *   "wait a few deviation events (~3 readings) before deciding to reroute,
 *    to avoid false positives from momentary GPS drift."
 *
 * Strategy:
 * - Each fix: feed perpendicular distance from filtered location to route line.
 * - If distance > threshold: increment strikes (capped).
 * - If distance <= threshold: decrement strikes (so brief GPS noise dissipates).
 * - Trigger a reroute when strikes >= limit AND the cooldown has elapsed.
 * - After triggering, reset strikes (the new route will reset the detector via
 *   `reset()` from the consumer when the route swaps in).
 */
export const OFF_ROUTE_THRESHOLD_M = 40;
export const OFF_ROUTE_STRIKE_LIMIT = 3;
export const REROUTE_MIN_INTERVAL_MS = 15000;

export function createOffRouteDetector({
  thresholdM = OFF_ROUTE_THRESHOLD_M,
  strikeLimit = OFF_ROUTE_STRIKE_LIMIT,
  minIntervalMs = REROUTE_MIN_INTERVAL_MS,
} = {}) {
  let strikes = 0;
  let lastRerouteAtMs = null;

  function update(distanceFromRouteM, nowMs = Date.now()) {
    if (distanceFromRouteM == null || !Number.isFinite(distanceFromRouteM)) {
      return { isOff: false, strikes, shouldReroute: false, distanceM: null };
    }

    if (distanceFromRouteM > thresholdM) {
      strikes = Math.min(strikes + 1, strikeLimit + 5);
    } else {
      strikes = Math.max(0, strikes - 1);
    }

    // The first reroute is always allowed. Subsequent reroutes must wait out
    // `minIntervalMs` so we don't hammer the Routes API on flapping signal.
    const cooldownOk = lastRerouteAtMs == null || nowMs - lastRerouteAtMs > minIntervalMs;
    const shouldReroute = strikes >= strikeLimit && cooldownOk;

    if (shouldReroute) {
      lastRerouteAtMs = nowMs;
      strikes = 0;
    }

    return {
      isOff: distanceFromRouteM > thresholdM,
      strikes,
      shouldReroute,
      distanceM: distanceFromRouteM,
    };
  }

  function reset() {
    strikes = 0;
    lastRerouteAtMs = null;
  }

  function getState() {
    return { strikes, lastRerouteAtMs };
  }

  return { update, reset, getState };
}
