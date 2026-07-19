/**
 * 1D Kalman filter on lat/lng (per-axis) using a single process noise term.
 *
 * Adapted from the well-known KalmanLatLong (Stack Overflow / Roboquard) pattern:
 * - State = position (lat, lng).
 * - Process noise grows with elapsed time and a tunable speed term Q (m/s).
 * - Measurement noise = GPS reported accuracy (metres).
 * - Variance is scalar (shared across both axes — accurate enough at human
 *   driving scales and avoids 2x covariance bookkeeping).
 *
 * Q tuning:
 * - Walking: Q ≈ 3 m/s
 * - Driving city: Q ≈ 6–10 m/s
 * - Driving highway: Q ≈ 15+ m/s
 * Higher Q = filter trusts new GPS more (less smoothing, less lag).
 */
export function createKalmanFilter({ processNoiseMps = 6 } = {}) {
  let lat = null;
  let lng = null;
  let varianceM2 = -1;
  let lastTimeMs = 0;

  function reset() {
    lat = null;
    lng = null;
    varianceM2 = -1;
    lastTimeMs = 0;
  }

  function update(rawLat, rawLng, accuracyM, timestampMs) {
    if (rawLat == null || rawLng == null) return null;
    const accuracy = Math.max(Number.isFinite(accuracyM) ? accuracyM : 5, 1);
    const t = timestampMs ?? Date.now();

    if (varianceM2 < 0) {
      lat = rawLat;
      lng = rawLng;
      varianceM2 = accuracy * accuracy;
      lastTimeMs = t;
      return { lat, lng, varianceM2 };
    }

    const dtMs = Math.max(t - lastTimeMs, 0);
    if (dtMs > 0) {
      varianceM2 += (dtMs / 1000) * processNoiseMps * processNoiseMps;
      lastTimeMs = t;
    }

    const measurementVariance = accuracy * accuracy;
    const k = varianceM2 / (varianceM2 + measurementVariance);
    lat += k * (rawLat - lat);
    lng += k * (rawLng - lng);
    varianceM2 *= 1 - k;

    return { lat, lng, varianceM2 };
  }

  function getState() {
    if (varianceM2 < 0) return null;
    return { lat, lng, varianceM2 };
  }

  return { update, reset, getState };
}
