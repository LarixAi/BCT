/**
 * Phase 5 — polyline performance helpers.
 *
 * The driver app draws Leaflet polylines for navigation routes. Long routes
 * (thousands of GeoJSON vertices from Google Routes API) are expensive to
 * redraw and rotate. These helpers reduce the work without changing the
 * visible route shape.
 */
import simplify from "@turf/simplify";
import lineSliceAlong from "@turf/line-slice-along";
import { lineString } from "@turf/helpers";

/**
 * Default RDP tolerance (in degrees) — roughly 5–8 metres at UK latitudes.
 * Aggressive enough to halve point counts on long motorway routes without
 * visibly changing the polyline shape.
 */
export const DEFAULT_SIMPLIFY_TOLERANCE_DEG = 0.00006;

/**
 * Threshold above which we run simplify. Short routes pass through as-is so
 * we don't pay the algorithm cost for ~1 km city hops.
 */
const SIMPLIFY_MIN_POINTS = 60;

/**
 * Simplify a Leaflet [lat, lng][] polyline using Ramer–Douglas–Peucker.
 * Pure function — does not mutate the input.
 *
 * @param {Array<[number, number]>} positions
 * @param {object} [opts]
 * @param {number} [opts.toleranceDeg=DEFAULT_SIMPLIFY_TOLERANCE_DEG]
 * @returns {Array<[number, number]>}
 */
export function simplifyLeafletPolyline(
  positions,
  { toleranceDeg = DEFAULT_SIMPLIFY_TOLERANCE_DEG } = {},
) {
  if (!Array.isArray(positions) || positions.length < SIMPLIFY_MIN_POINTS) {
    return positions ?? [];
  }
  const valid = positions.filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  if (valid.length < SIMPLIFY_MIN_POINTS) return valid;

  const coords = valid.map(([lat, lng]) => [lng, lat]); // GeoJSON order
  const feature = lineString(coords);
  const simplified = simplify(feature, {
    tolerance: toleranceDeg,
    highQuality: false,
    mutate: true,
  });
  return simplified.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

/**
 * Drop the route segment the driver has already passed so the renderer only
 * draws the line from the current position to the destination.
 *
 * - `routeLine` must be a Turf LineString (use `buildRouteLine`).
 * - `alongRouteM` is the engine's reported distance along the polyline; the
 *   slice runs from there to the route end.
 * - Falls back to the full polyline if anything is missing or the slice
 *   would produce <2 points.
 *
 * @returns {Array<[number, number]>}  Leaflet [lat, lng] tuples ahead of driver.
 */
export function trimPassedRoute({
  routeLine,
  alongRouteM,
  totalLengthM,
  fullPositions,
  keepBackTrailM = 60,
}) {
  if (!routeLine || alongRouteM == null || !Number.isFinite(alongRouteM)) {
    return fullPositions ?? [];
  }
  if (totalLengthM == null || !Number.isFinite(totalLengthM) || totalLengthM <= 0) {
    return fullPositions ?? [];
  }

  // Keep a short tail behind the driver so the polyline doesn't appear to
  // disconnect from the marker on a sharp turn.
  const startKm = Math.max(0, (alongRouteM - keepBackTrailM) / 1000);
  const endKm = totalLengthM / 1000;
  if (endKm - startKm < 0.005) {
    return fullPositions ?? [];
  }

  try {
    const sliced = lineSliceAlong(routeLine, startKm, endKm, { units: "kilometers" });
    const coords = sliced?.geometry?.coordinates ?? [];
    if (coords.length < 2) return fullPositions ?? [];
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return fullPositions ?? [];
  }
}
