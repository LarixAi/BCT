/**
 * Gently pans the map toward the driver — only when they've moved meaningfully
 * and the user isn't dragging.
 */
import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { haversineMeters } from "@/lib/smoothGps";

export default function FollowDriverMap({ lat, lng, enabled = true, minMoveM = 45, minIntervalMs = 15000 }) {
  const map = useMap();
  const draggingRef = useRef(false);
  const lastPanRef = useRef(0);
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
    if (!enabled || draggingRef.current) return;

    const now = Date.now();
    const moved = haversineMeters(lastTargetRef.current.lat, lastTargetRef.current.lng, lat, lng);
    if (now - lastPanRef.current < minIntervalMs && moved < minMoveM) return;
    if (moved < minMoveM) return;

    lastPanRef.current = now;
    lastTargetRef.current = { lat, lng };

    const center = map.getCenter();
    const centerMove = haversineMeters(center.lat, center.lng, lat, lng);
    if (centerMove < minMoveM * 0.5) return;

    map.panTo([lat, lng], { animate: true, duration: 1.4, easeLinearity: 0.2 });
  }, [lat, lng, map, enabled, minMoveM, minIntervalMs]);

  return null;
}
