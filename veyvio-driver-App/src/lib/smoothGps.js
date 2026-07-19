/** Approximate metres between two WGS84 points. */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Exponential moving average — higher alpha = snappier. */
export function emaCoord(prev, next, alpha = 0.25) {
  if (prev == null) return next;
  return prev + (next - prev) * alpha;
}

/**
 * Drop GPS spikes (common indoors / urban canyon).
 * @returns {boolean} true if reading should be used
 */
export function isGpsReadingStable({
  lat,
  lng,
  accuracy,
  prevLat,
  prevLng,
  prevAt,
  maxAccuracyM = 80,
  maxJumpM = 120,
  minIntervalMs = 800,
}) {
  if (lat == null || lng == null) return false;
  if (accuracy != null && accuracy > maxAccuracyM) return false;

  if (prevLat == null || prevLng == null || !prevAt) return true;

  const elapsed = Date.now() - prevAt;
  if (elapsed < minIntervalMs) return false;

  const jump = haversineMeters(prevLat, prevLng, lat, lng);
  const maxAllowed = Math.max(maxJumpM, (elapsed / 1000) * 45);
  return jump <= maxAllowed;
}

/** Snap to a coarse grid (~200 m) to avoid noisy downstream refetches. */
export function coarseCoord(value, grid = 500) {
  return Math.round(value * grid) / grid;
}
