/**
 * Snap raw GPS to the active route polyline using Turf nearestPointOnLine.
 *
 * - Uses the **route** as ground truth (we don't snap to arbitrary roads —
 *   that would risk parallel-road misalignment in cities).
 * - If the perpendicular distance from the GPS fix to the route exceeds
 *   `maxSnapDistanceM` the fix is treated as "off route" and we DO NOT snap
 *   (the off-route detector handles rerouting separately).
 *
 * Coordinates are stored as Leaflet [lat, lng] tuples in the rest of the app,
 * but Turf works in GeoJSON [lng, lat] order — this module handles the
 * conversion at the boundary.
 */
import nearestPointOnLine from "@turf/nearest-point-on-line";
import { lineString, point as turfPoint } from "@turf/helpers";
import length from "@turf/length";

export const DEFAULT_MAX_SNAP_DISTANCE_M = 30;

/** Build a Turf LineString from Leaflet positions ([lat, lng][]). */
export function buildRouteLine(positions) {
  if (!Array.isArray(positions) || positions.length < 2) return null;
  const coords = positions
    .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map(([lat, lng]) => [lng, lat]);
  if (coords.length < 2) return null;
  return lineString(coords);
}

/** Total polyline length in metres. */
export function getRouteLengthMeters(routeLine) {
  if (!routeLine) return 0;
  return length(routeLine, { units: "meters" });
}

/**
 * Snap a fix to the route line.
 *
 * @param {object} args
 * @param {number} args.lat
 * @param {number} args.lng
 * @param {object} args.routeLine - Turf LineString from buildRouteLine
 * @param {number} [args.maxSnapDistanceM=30]
 * @returns {{
 *   snappedLat: number,
 *   snappedLng: number,
 *   distanceM: number | null,   // perpendicular distance to route (raw)
 *   alongM: number | null,      // distance along route to snapped point
 *   snapped: boolean,
 * }}
 */
export function snapToRouteLine({
  lat,
  lng,
  routeLine,
  maxSnapDistanceM = DEFAULT_MAX_SNAP_DISTANCE_M,
}) {
  if (!routeLine || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      snappedLat: lat,
      snappedLng: lng,
      distanceM: null,
      alongM: null,
      snapped: false,
    };
  }

  let result;
  try {
    result = nearestPointOnLine(routeLine, turfPoint([lng, lat]), { units: "meters" });
  } catch {
    return {
      snappedLat: lat,
      snappedLng: lng,
      distanceM: null,
      alongM: null,
      snapped: false,
    };
  }

  const distanceM = result?.properties?.dist ?? null;
  const alongM = result?.properties?.location ?? null;
  const coords = result?.geometry?.coordinates;

  if (!Array.isArray(coords) || coords.length < 2 || distanceM == null) {
    return {
      snappedLat: lat,
      snappedLng: lng,
      distanceM,
      alongM,
      snapped: false,
    };
  }

  if (distanceM > maxSnapDistanceM) {
    return {
      snappedLat: lat,
      snappedLng: lng,
      distanceM,
      alongM,
      snapped: false,
    };
  }

  return {
    snappedLat: coords[1],
    snappedLng: coords[0],
    distanceM,
    alongM,
    snapped: true,
  };
}
