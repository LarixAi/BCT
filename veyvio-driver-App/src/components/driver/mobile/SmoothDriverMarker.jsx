/**
 * Driver marker that eases between GPS updates instead of jumping.
 */
import { useEffect, useRef } from "react";
import { Marker } from "react-leaflet";

const SNAP_THRESHOLD = 0.000006;
const EASE = 0.14;

export default function SmoothDriverMarker({ lat, lng, icon, zIndexOffset = 800 }) {
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
  }, [lat, lng, hasCoords]);

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
