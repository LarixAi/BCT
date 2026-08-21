/**
 * Driver marker. By default eases between updates instead of jumping — for
 * a coarse, infrequently-published position (e.g. useDriverMapPosition's
 * ~1.5s EMA-smoothed updates) that's genuinely needed.
 *
 * Pass `smooth={false}` when the position is already smoothed upstream at a
 * fast cadence — the turn-by-turn location engine's `displayLocation` is
 * dead-reckoned and eased at ~8Hz specifically so the marker/camera can
 * consume it directly (see useNavigationLocationEngine.js and the matching
 * comment in NavigationMapCamera.jsx). Easing an already-eased, frequently-
 * updating value here just cascades two low-pass filters and adds visible
 * lag on top of the source-switching jump this was originally mistaken for.
 */
import { useEffect, useRef } from "react";
import { Marker } from "react-leaflet";

const SNAP_THRESHOLD = 0.000006;
const EASE = 0.14;

export default function SmoothDriverMarker({ lat, lng, icon, zIndexOffset = 800, smooth = true }) {
  const markerRef = useRef(null);
  const displayRef = useRef({ lat, lng });
  const targetRef = useRef({ lat, lng });
  const rafRef = useRef(null);

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    markerRef.current?.setIcon(icon);
  }, [icon]);

  useEffect(() => {
    if (!hasCoords) return undefined;

    if (!smooth) {
      displayRef.current = { lat, lng };
      markerRef.current?.setLatLng([lat, lng]);
      return undefined;
    }

    targetRef.current = { lat, lng };

    const tick = () => {
      const marker = markerRef.current;
      if (!marker) return;

      const d = displayRef.current;
      const t = targetRef.current;
      d.lat += (t.lat - d.lat) * EASE;
      d.lng += (t.lng - d.lng) * EASE;
      marker.setLatLng([d.lat, d.lng]);

      if (
        Math.abs(t.lat - d.lat) > SNAP_THRESHOLD ||
        Math.abs(t.lng - d.lng) > SNAP_THRESHOLD
      ) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        d.lat = t.lat;
        d.lng = t.lng;
        marker.setLatLng([d.lat, d.lng]);
        rafRef.current = null;
      }
    };

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [lat, lng, hasCoords, smooth]);

  if (!hasCoords) return null;

  return (
    <Marker
      ref={markerRef}
      position={[displayRef.current.lat, displayRef.current.lng]}
      icon={icon}
      zIndexOffset={zIndexOffset}
    />
  );
}
