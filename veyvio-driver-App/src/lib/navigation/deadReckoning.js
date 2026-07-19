/**
 * Dead-reckoning helpers for between-fix smoothing.
 *
 * Mobile GPS (Capacitor / browser geolocation) fires roughly once per second
 * even with `enableHighAccuracy: true`. If we just snap the camera and marker
 * to each fix, the user sees stillness then a lurch every second — the
 * "jumpy" feeling Google Maps doesn't have.
 *
 * The fix Google / Mapbox / Waze use is a short forward projection: between
 * fixes, advance the displayed position along the last known heading at the
 * last known speed. When the next fix arrives we softly correct any drift.
 *
 * The projection is intentionally capped (we don't extrapolate forever — a
 * stale fix shouldn't send the camera off into a field if the device parked).
 */

/** Equirectangular metres per degree of latitude — accurate to <0.5%. */
const M_PER_DEG_LAT = 111111;

const MAX_PROJECTION_SECONDS = 3;
const MIN_PROJECTION_SPEED_MPS = 0.5; // ~1.1 mph; below this, treat as stationary

/**
 * Project a fix forward in time using its speed + heading.
 *
 * @param {object}  fix
 * @param {number}  fix.lat
 * @param {number}  fix.lng
 * @param {number?} fix.heading      degrees clockwise from north
 * @param {number?} fix.speed        metres/second (GPS course-over-ground)
 * @param {number}  sinceMs          ms elapsed since the fix was sampled
 * @returns {{ lat: number, lng: number } | null}
 */
export function projectPosition(fix, sinceMs) {
  if (!fix || fix.lat == null || fix.lng == null) return null;
  const speed = Number.isFinite(fix.speed) ? Math.max(0, fix.speed) : 0;
  const heading = fix.heading;

  if (speed < MIN_PROJECTION_SPEED_MPS) return { lat: fix.lat, lng: fix.lng };
  if (heading == null || !Number.isFinite(heading) || heading < 0) {
    return { lat: fix.lat, lng: fix.lng };
  }

  const dt = Math.min(Math.max(sinceMs / 1000, 0), MAX_PROJECTION_SECONDS);
  const distance = speed * dt;
  if (distance < 0.05) return { lat: fix.lat, lng: fix.lng };

  const headingRad = (heading * Math.PI) / 180;
  const dNorth = distance * Math.cos(headingRad);
  const dEast = distance * Math.sin(headingRad);
  const cosLat = Math.cos((fix.lat * Math.PI) / 180);

  return {
    lat: fix.lat + dNorth / M_PER_DEG_LAT,
    lng: fix.lng + dEast / (M_PER_DEG_LAT * Math.max(cosLat, 1e-6)),
  };
}

/**
 * Linear interpolate the displayed position toward a target. Lower factor =
 * smoother but laggier; higher = snappier but bumpier.
 */
export function lerpLatLng(current, target, factor = 0.22) {
  if (!current) return target;
  if (!target) return current;
  return {
    lat: current.lat + (target.lat - current.lat) * factor,
    lng: current.lng + (target.lng - current.lng) * factor,
  };
}
