/**
 * Phase 7 — pure helpers that turn the engine's route output into the
 * GeoJSON shapes that a native MapLibre `addSource({ type: "geojson" })`
 * call expects.
 *
 * Kept dependency-free (just Turf, which we already bundle) so the hook
 * that drives the map can stay tiny and testable.
 */
import {
  simplifyLeafletPolyline,
  trimPassedRoute,
} from "./routePolylineUtils.js";
import {
  buildRouteLine,
  getRouteLengthMeters,
} from "./locationEngine/snapToRoute.js";

/** Empty GeoJSON FeatureCollection — used as the source's resting state. */
export const EMPTY_FEATURE_COLLECTION = Object.freeze({
  type: "FeatureCollection",
  features: [],
});

/**
 * Build the GeoJSON LineString for the **ahead-of-driver** segment of the
 * active route, applying:
 *   1. RDP simplification (cheap to render, identical shape on screen).
 *   2. Trimming behind the engine's `alongRouteM` (with a 60 m visual tail).
 *
 * Falls back gracefully:
 *   - Empty input → empty FC (renderer simply hides the layer).
 *   - No `alongRouteM` → returns the simplified full route.
 */
export function buildRouteAheadGeoJson({ leafletPositions, alongRouteM = null }) {
  const simplified = simplifyLeafletPolyline(leafletPositions ?? []);
  if (!simplified || simplified.length < 2) return EMPTY_FEATURE_COLLECTION;

  let positions = simplified;
  if (alongRouteM != null) {
    const routeLine = buildRouteLine(simplified);
    if (routeLine) {
      const totalLengthM = getRouteLengthMeters(routeLine);
      positions = trimPassedRoute({
        routeLine,
        alongRouteM,
        totalLengthM,
        fullPositions: simplified,
      });
    }
  }

  if (!positions || positions.length < 2) return EMPTY_FEATURE_COLLECTION;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          // GeoJSON is [lng, lat]; engine output is [lat, lng].
          coordinates: positions.map(([lat, lng]) => [lng, lat]),
        },
        properties: { kind: "route_ahead" },
      },
    ],
  };
}

/**
 * Build a GeoJSON FeatureCollection of stop markers (P / D / numbered) so
 * a single MapLibre `circle` + `symbol` layer pair can render them.
 */
export function buildStopsGeoJson(stops = []) {
  if (!Array.isArray(stops) || stops.length === 0) return EMPTY_FEATURE_COLLECTION;
  const features = stops
    .filter((s) => Number.isFinite(s?.latitude) && Number.isFinite(s?.longitude))
    .map((s, idx) => {
      const isDestination = idx === stops.length - 1;
      const label = isDestination ? "D" : idx === 0 ? "P" : String(idx + 1);
      const colour = isDestination ? "#DC2626" : idx === 0 ? "#059669" : "#0F172A";
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id ?? `stop-${idx}`,
          label,
          colour,
          kind: "stop",
        },
      };
    });
  return { type: "FeatureCollection", features };
}
