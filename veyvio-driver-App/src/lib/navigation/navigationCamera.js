/** Camera modes for in-app Leaflet navigation (Uber / Google style). */
export const NAV_CAMERA_MODES = {
  FOLLOW_HEADING: "follow_heading",
  NORTH_UP: "north_up",
  ROUTE_OVERVIEW: "route_overview",
};

/** @deprecated use NAV_CAMERA_MODES */
export const CAMERA_MODES = {
  OVERVIEW: "overview",
  FOLLOW: "follow",
  NAVIGATION: "navigation",
};

/**
 * Minimum gap between Leaflet `setView` calls in follow mode.
 *
 * The location engine publishes ~8 Hz dead-reckoned updates between 1 Hz GPS
 * fixes. We want the camera to track that — too high a throttle here is what
 * caused the previous "lurch every 2.5 s" feel. 220 ms ≈ 4–5 fps which is
 * smooth on Android Leaflet without thrashing the map pane transform.
 */
export const CAMERA_UPDATE_MIN_MS = 220;
export const CAMERA_ANIMATE_DURATION_S = 0.35;

/** Minimum speed (m/s) before we treat GPS heading as reliable (~9 mph). */
const ROTATE_SPEED_MPS = 4;
/**
 * Below this speed (m/s ≈ 3 mph) we *lock the map to north-up* even in
 * FOLLOW_HEADING mode. Two reasons:
 *  - GPS heading is unreliable when nearly stationary (course-over-ground
 *    is dominated by noise), so trusting it makes the map twitch at red
 *    lights and parking maneuvers.
 *  - The compass-fused fallback rotates with phone orientation; if the
 *    phone slips on the dash the map shouldn't follow it.
 * The marker still rotates so the driver retains a sense of orientation.
 */
const STATIONARY_LOCK_SPEED_MPS = 1.4;

/**
 * Smooth speed-based zoom curve (Phase 3).
 *
 * Uber / Google Maps style: zoom in close when stationary so the driver can
 * see junctions, ramp out as speed increases so they see more road ahead.
 * Continuous (not stepped) — relies on the `zoomSnap: 0.25` option in
 * driverMapLeafletOptions for the camera to honor fractional zoom levels.
 */
const ZOOM_AT_REST = 17;
const ZOOM_AT_HIGH_SPEED = 15.25;
const HIGH_SPEED_MPS = 25; // ~56 mph

function speedToFollowZoom(speedMps) {
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  if (speed >= HIGH_SPEED_MPS) return ZOOM_AT_HIGH_SPEED;
  const t = speed / HIGH_SPEED_MPS;
  // Quadratic ease — feels less linear, more like Google Maps' zoom curve.
  const eased = t * t;
  return ZOOM_AT_REST + (ZOOM_AT_HIGH_SPEED - ZOOM_AT_REST) * eased;
}

export function shouldRotateCamera({ speed, heading }) {
  if (heading == null || !Number.isFinite(heading) || heading < 0) return false;
  const speedMs = speed ?? 0;
  if (speedMs < ROTATE_SPEED_MPS) return false;
  return true;
}

export function normalizeHeading(heading) {
  if (heading == null || !Number.isFinite(heading) || heading < 0) return null;
  return heading;
}

/**
 * Leaflet setView options derived from GPS + camera mode.
 */
export function buildLeafletCamera({
  latitude,
  longitude,
  heading,
  speed,
  mode = NAV_CAMERA_MODES.FOLLOW_HEADING,
}) {
  if (latitude == null || longitude == null) return null;

  let zoom;
  if (mode === NAV_CAMERA_MODES.ROUTE_OVERVIEW) {
    zoom = 14;
  } else {
    zoom = speedToFollowZoom(speed);
  }

  const validHeading = normalizeHeading(heading);

  let mapBearing = 0;
  let markerHeading = null;

  const speedMps = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const stationary = speedMps < STATIONARY_LOCK_SPEED_MPS;

  if (mode === NAV_CAMERA_MODES.FOLLOW_HEADING && validHeading != null) {
    if (stationary) {
      // Don't spin the map when the vehicle isn't actually moving — keep
      // it north-up and let the marker carry orientation.
      mapBearing = 0;
      markerHeading = validHeading;
    } else {
      mapBearing = validHeading;
      markerHeading = null;
    }
  } else if (mode === NAV_CAMERA_MODES.NORTH_UP && validHeading != null) {
    mapBearing = 0;
    markerHeading = validHeading;
  }

  return {
    center: [latitude, longitude],
    zoom,
    mapBearing,
    markerHeading,
  };
}

export function shouldUpdateCamera(lastUpdateMs, now = Date.now()) {
  return now - lastUpdateMs >= CAMERA_UPDATE_MIN_MS;
}

// Re-exported for tests / docs.
export { speedToFollowZoom };
