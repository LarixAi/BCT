/**
 * Shared Leaflet options for driver maps (MapLibre GL layer).
 * - `zoomAnimation: false` stops the GL canvas scaling out of sync during pinch-zoom.
 * - `zoomSnap: 0.25` lets the navigation camera ramp zoom continuously with
 *   speed (Phase 3 smooth zoom curve) without snapping to integer steps.
 */
export const DRIVER_MAP_LEAFLET_OPTIONS = {
  zoomControl: false,
  attributionControl: false,
  zoomAnimation: false,
  fadeAnimation: false,
  zoomSnap: 0.25,
  zoomDelta: 0.25,
};
