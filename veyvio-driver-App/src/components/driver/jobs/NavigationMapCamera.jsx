import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { haversineMeters } from "@/lib/smoothGps";
import {
  buildLeafletCamera,
  CAMERA_ANIMATE_DURATION_S,
  NAV_CAMERA_MODES,
  shouldUpdateCamera,
} from "@/lib/navigation/navigationCamera";
import { setMapBearing } from "@/lib/navigation/navigationMapBearing";

const ROUTE_FIT_PADDING = {
  paddingTopLeft: [80, 180],
  paddingBottomRight: [80, 180],
};

/**
 * Leaflet camera controller — follow heading, north-up, or route overview.
 */
export default function NavigationMapCamera({
  lat,
  lng,
  heading = null,
  speed = null,
  cameraMode = NAV_CAMERA_MODES.FOLLOW_HEADING,
  followEnabled = true,
  routePoints = [],
  destination = null,
  fitRouteTrigger = 0,
  recenterTrigger = 0,
  // Lowered from 10 m to 2 m: the location engine publishes smooth, dead-
  // reckoned positions between fixes; a high move threshold here would mask
  // that smoothness and re-introduce the old "lurch every 2.5 s" feel.
  minMoveM = 2,
  onMarkerHeadingChange,
  onUserPan,
}) {
  const map = useMap();
  const draggingRef = useRef(false);
  const lastCameraUpdateRef = useRef(0);
  const lastTargetRef = useRef({ lat, lng });
  const lastFitTriggerRef = useRef(0);
  /**
   * Last zoom value the camera *requested* via setView. Used to tell user
   * pinch-zoom apart from our own programmatic updates so we don't fight
   * the driver if they pinch in to peek ahead.
   */
  const lastRequestedZoomRef = useRef(null);

  useMapEvents({
    dragstart: () => {
      draggingRef.current = true;
      onUserPan?.();
    },
    dragend: () => {
      draggingRef.current = false;
    },
  });

  useEffect(() => {
    if (!fitRouteTrigger || fitRouteTrigger === lastFitTriggerRef.current) return;
    lastFitTriggerRef.current = fitRouteTrigger;

    const pts = [...(routePoints ?? [])];
    if (lat != null && lng != null) pts.unshift([lat, lng]);
    if (destination?.latitude != null && destination?.longitude != null) {
      pts.push([destination.latitude, destination.longitude]);
    }

    const valid = pts.filter((p) => p?.[0] != null && p?.[1] != null);
    if (valid.length < 1) return;

    setMapBearing(map, 0);
    onMarkerHeadingChange?.(heading);

    if (valid.length === 1) {
      map.setView(valid[0], 15, { animate: true, duration: CAMERA_ANIMATE_DURATION_S });
      return;
    }

    map.fitBounds(L.latLngBounds(valid), {
      ...ROUTE_FIT_PADDING,
      maxZoom: 16,
      animate: true,
    });
  }, [fitRouteTrigger, routePoints, lat, lng, destination, map, heading, onMarkerHeadingChange]);

  const prevRecenterRef = useRef(recenterTrigger);

  useEffect(() => {
    if (recenterTrigger !== prevRecenterRef.current) {
      prevRecenterRef.current = recenterTrigger;
      lastCameraUpdateRef.current = 0;
      // Reset user-zoom-respect so the speed-driven zoom curve takes over
      // again — driver explicitly asked to recenter.
      lastRequestedZoomRef.current = null;
    }
  }, [recenterTrigger]);

  useEffect(() => {
    if (!followEnabled || cameraMode === NAV_CAMERA_MODES.ROUTE_OVERVIEW) return;
    if (draggingRef.current || lat == null || lng == null) return;

    const now = Date.now();
    const moved = haversineMeters(lastTargetRef.current.lat, lastTargetRef.current.lng, lat, lng);
    const dueByTime = shouldUpdateCamera(lastCameraUpdateRef.current, now);

    if (!dueByTime && moved < minMoveM) return;

    lastCameraUpdateRef.current = now;
    lastTargetRef.current = { lat, lng };

    const camera = buildLeafletCamera({
      latitude: lat,
      longitude: lng,
      heading,
      speed,
      mode: cameraMode,
    });
    if (!camera) return;

    // User-zoom respect: if the live map zoom drifted noticeably from what we
    // last requested, the driver pinched in/out — keep their zoom intent.
    const currentZoom = map.getZoom();
    const userZoomed =
      lastRequestedZoomRef.current != null &&
      Math.abs(currentZoom - lastRequestedZoomRef.current) > 0.4;

    const targetZoom = userZoomed ? currentZoom : camera.zoom;
    lastRequestedZoomRef.current = targetZoom;

    map.setView(camera.center, targetZoom, {
      animate: true,
      duration: CAMERA_ANIMATE_DURATION_S,
    });

    setMapBearing(map, camera.mapBearing);
    onMarkerHeadingChange?.(camera.markerHeading);
  }, [
    lat,
    lng,
    map,
    followEnabled,
    minMoveM,
    heading,
    speed,
    cameraMode,
    onMarkerHeadingChange,
    recenterTrigger,
  ]);

  useEffect(() => {
    if (cameraMode === NAV_CAMERA_MODES.ROUTE_OVERVIEW) return;
    return () => setMapBearing(map, 0);
  }, [cameraMode, map]);

  return null;
}
