import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { haversineMeters } from "@/lib/smoothGps";
import {
  buildLeafletCamera,
  CAMERA_ANIMATE_DURATION_S,
  CAMERA_MODES,
  shouldUpdateCamera,
} from "@/lib/navigation/navigationCamera";

/**
 * Stable map follow — throttled pan/zoom; heading rotation applies to driver marker only.
 */
export default function FollowNavigationMap({
  lat,
  lng,
  enabled = true,
  heading = null,
  speed = null,
  cameraMode = CAMERA_MODES.NAVIGATION,
  minMoveM = 12,
  onMarkerHeadingChange,
}) {
  const map = useMap();
  const draggingRef = useRef(false);
  const lastCameraUpdateRef = useRef(0);
  const lastTargetRef = useRef({ lat, lng });

  useMapEvents({
    dragstart: () => {
      draggingRef.current = true;
    },
    dragend: () => {
      draggingRef.current = false;
    },
  });

  useEffect(() => {
    if (!enabled || draggingRef.current || lat == null || lng == null) return;

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

    map.setView(camera.center, Math.max(map.getZoom(), camera.zoom), {
      animate: true,
      duration: CAMERA_ANIMATE_DURATION_S,
    });

    onMarkerHeadingChange?.(camera.markerHeading);
  }, [
    lat,
    lng,
    map,
    enabled,
    minMoveM,
    heading,
    speed,
    cameraMode,
    onMarkerHeadingChange,
  ]);

  return null;
}
