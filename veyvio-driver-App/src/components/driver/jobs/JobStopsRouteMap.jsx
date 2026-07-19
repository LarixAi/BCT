import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchRoadRoute } from "@/lib/fetchRoadRoute";
import { DRIVER_MAP_ROUTE_STYLE, DRIVER_MAP_ROUTE_STYLE_COMPACT } from "@/lib/driverMapTheme";

const stopIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

function FitJobRouteBounds({ points, routeKey }) {
  const map = useMap();
  const fittedRef = useRef(null);

  useEffect(() => {
    if (fittedRef.current === routeKey) return;
    if (points.length < 1) return;
    fittedRef.current = routeKey;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: false });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [80, 40], maxZoom: 15, animate: true });
  }, [map, points, routeKey]);

  return null;
}

/** Leaflet child — draw multi-stop route inside an existing MapContainer. */
export default function JobStopsRouteMap({ stops, driverLat, driverLng, compact = false }) {
  const [segments, setSegments] = useState([]);

  const stopPoints = useMemo(
    () => (stops ?? []).filter((s) => s.lat != null && s.lng != null).map((s) => [s.lat, s.lng]),
    [stops],
  );

  const routeKey = useMemo(
    () => `${stops?.map((s) => s.id).join("-")}-${driverLat}-${driverLng}`,
    [stops, driverLat, driverLng],
  );

  useEffect(() => {
    if (stopPoints.length < 1) {
      setSegments([]);
      return;
    }

    let cancelled = false;
    const chain = [];
    if (driverLat != null && driverLng != null) chain.push([driverLat, driverLng]);
    chain.push(...stopPoints);

    if (chain.length < 2) {
      setSegments([]);
      return;
    }

    async function build() {
      const legs = [];
      for (let i = 0; i < chain.length - 1; i++) {
        const [aLat, aLng] = chain[i];
        const [bLat, bLng] = chain[i + 1];
        try {
          const pts = await fetchRoadRoute(aLat, aLng, bLat, bLng);
          legs.push(pts.length >= 2 ? pts : [chain[i], chain[i + 1]]);
        } catch {
          legs.push([chain[i], chain[i + 1]]);
        }
      }
      if (!cancelled) setSegments(legs);
    }

    void build();
    return () => {
      cancelled = true;
    };
  }, [routeKey, stopPoints, driverLat, driverLng]);

  const fitPoints = useMemo(() => {
    const pts = [...stopPoints];
    if (driverLat != null && driverLng != null) pts.unshift([driverLat, driverLng]);
    return pts;
  }, [stopPoints, driverLat, driverLng]);

  const lineStyle = compact ? DRIVER_MAP_ROUTE_STYLE_COMPACT : DRIVER_MAP_ROUTE_STYLE;

  return (
    <>
      {segments.map((positions, i) => (
        <Polyline key={i} positions={positions} pathOptions={lineStyle} />
      ))}
      {stopPoints.map((pos, i) => (
        <Marker key={i} position={pos} icon={stopIcon} />
      ))}
      <FitJobRouteBounds points={fitPoints} routeKey={routeKey} />
    </>
  );
}
