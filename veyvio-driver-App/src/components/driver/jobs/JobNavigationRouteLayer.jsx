import { useEffect, useMemo, useRef } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import {
  simplifyLeafletPolyline,
  trimPassedRoute,
} from "@/lib/navigation/routePolylineUtils";
import {
  buildRouteLine,
  getRouteLengthMeters,
} from "@/lib/navigation/locationEngine/snapToRoute";

const NAV_ROUTE_STYLE = {
  color: "#2563EB",
  weight: 6,
  opacity: 0.92,
  lineCap: "round",
  lineJoin: "round",
};

const FALLBACK_ROUTE_STYLE = {
  ...NAV_ROUTE_STYLE,
  dashArray: "10 8",
  opacity: 0.75,
};

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:999px;background:#2563EB;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px">→</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function stopMarkerIcon(label, color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:999px;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:10px">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const pickupIcon = stopMarkerIcon("P", "#059669");
const dropoffIcon = stopMarkerIcon("D", "#DC2626");

function FitNavigationRouteBounds({ points, routeKey, paddingBottom = 120, enabled = true }) {
  const map = useMap();
  const fittedRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (fittedRef.current === routeKey) return;
    const valid = (points ?? []).filter((p) => p?.[0] != null && p?.[1] != null);
    if (valid.length < 1) return;

    fittedRef.current = routeKey;
    if (valid.length === 1) {
      map.setView(valid[0], 15, { animate: false });
      return;
    }

    map.fitBounds(L.latLngBounds(valid), {
      paddingTopLeft: [48, 120],
      paddingBottomRight: [48, paddingBottom],
      maxZoom: 16,
      animate: false,
    });
  }, [map, points, routeKey, paddingBottom, enabled]);

  return null;
}

export default function JobNavigationRouteLayer({
  leafletPositions,
  destination,
  driverLat,
  driverLng,
  stops = [],
  routeKey = "route",
  fitPaddingBottom = 120,
  fitOnLoad = false,
  /** Phase-5 trim — distance the driver has covered along the route polyline. */
  alongRouteM = null,
}) {
  const hasDestination =
    destination?.latitude != null && destination?.longitude != null;

  // Phase 5 — simplify on the way in (cheap RDP) so every redraw is cheaper.
  const simplifiedPositions = useMemo(
    () => simplifyLeafletPolyline(leafletPositions ?? []),
    [leafletPositions],
  );

  // Phase 5 — trim the polyline behind the driver so we only draw what's ahead.
  const drawPositions = useMemo(() => {
    if (!simplifiedPositions || simplifiedPositions.length < 2) return simplifiedPositions ?? [];
    if (alongRouteM == null) return simplifiedPositions;
    const routeLine = buildRouteLine(simplifiedPositions);
    if (!routeLine) return simplifiedPositions;
    const totalLengthM = getRouteLengthMeters(routeLine);
    return trimPassedRoute({
      routeLine,
      alongRouteM,
      totalLengthM,
      fullPositions: simplifiedPositions,
    });
  }, [simplifiedPositions, alongRouteM]);

  const fallbackLine = useMemo(() => {
    if (
      drawPositions?.length > 1 ||
      driverLat == null ||
      driverLng == null ||
      !hasDestination
    ) {
      return null;
    }
    return [
      [driverLat, driverLng],
      [destination.latitude, destination.longitude],
    ];
  }, [drawPositions, driverLat, driverLng, destination, hasDestination]);

  const fitPoints = useMemo(() => {
    const pts = [...(simplifiedPositions ?? [])];
    if (driverLat != null && driverLng != null) pts.unshift([driverLat, driverLng]);
    if (hasDestination) pts.push([destination.latitude, destination.longitude]);
    return pts;
  }, [simplifiedPositions, driverLat, driverLng, destination, hasDestination]);

  const stopMarkers = useMemo(() => {
    return (stops ?? [])
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.id,
        lat: s.lat,
        lng: s.lng,
        icon:
          s.stopType === "pickup"
            ? pickupIcon
            : s.stopType === "dropoff"
              ? dropoffIcon
              : destinationIcon,
      }));
  }, [stops]);

  if (!drawPositions?.length && !hasDestination && !fallbackLine) return null;

  return (
    <>
      {drawPositions?.length > 1 ? (
        <Polyline
          key={`${routeKey}-full`}
          positions={drawPositions}
          pathOptions={NAV_ROUTE_STYLE}
        />
      ) : fallbackLine ? (
        <Polyline
          key={`${routeKey}-fallback`}
          positions={fallbackLine}
          pathOptions={FALLBACK_ROUTE_STYLE}
        />
      ) : null}

      {stopMarkers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={m.icon} zIndexOffset={650} />
      ))}

      {hasDestination ? (
        <Marker
          position={[destination.latitude, destination.longitude]}
          icon={destinationIcon}
          zIndexOffset={700}
        />
      ) : null}

      <FitNavigationRouteBounds
        points={fitPoints}
        routeKey={routeKey}
        paddingBottom={fitPaddingBottom}
        enabled={fitOnLoad}
      />
    </>
  );
}
