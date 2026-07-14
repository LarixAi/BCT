import { useEffect, useRef, useState } from "react";
import type { DivIcon, Map as LeafletMap, Polyline } from "leaflet";
import { cn } from "@/lib/utils";
import {
  buildJourneyMapStops,
  estimateDriverPosition,
  type JourneyMapStop,
} from "@/domain/journey/journey-map";
import { useEnsureJourneyRoute } from "@/features/navigation/use-journey-navigation";
import { useNavigationRoute } from "@/store/navigation";
import { useDriverPreferencesStore } from "@/store/driver-preferences";
import { mapThemeClass, mapTileLayerForFilter, type MapDisplayFilter } from "@/types/driver-filters";
import { useDriverStore } from "@/store/driver";
import { JourneyMapPlaceholder } from "./JourneyMapPlaceholder";
import { MapStatusOverlay } from "./MapStatusOverlay";

const BRAND = {
  link: "#2F6BFF",
  ok: "#178C4B",
  muted: "#98A2B3",
  vor: "#D92D20",
  warn: "#D97706",
};

function markerIcon(L: typeof import("leaflet"), color: string, size: number, ring = false): DivIcon {
  const ringStyle = ring
    ? "box-shadow:0 0 0 4px rgba(47,107,255,0.25), 0 2px 6px rgba(11,21,38,0.35);"
    : "box-shadow:0 2px 4px rgba(11,21,38,0.25);";

  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2.5px solid #fff;${ringStyle}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function splitGeometryAtDriver(
  geometry: [number, number][],
  driverPosition: [number, number] | null,
): { traveled: [number, number][]; remaining: [number, number][] } {
  if (geometry.length < 2 || !driverPosition) {
    return { traveled: [], remaining: geometry };
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < geometry.length; i++) {
    const dist = haversineM(driverPosition, geometry[i]);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestIndex = i;
    }
  }

  return {
    traveled: geometry.slice(0, closestIndex + 1),
    remaining: geometry.slice(closestIndex),
  };
}

function haversineM(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function addStraightRouteLayers(
  L: typeof import("leaflet"),
  map: LeafletMap,
  stops: JourneyMapStop[],
  highlight: "current" | "diversion" | "off-route",
) {
  const currentIdx = stops.findIndex((stop) => stop.status === "current");
  const coords = stops.map((stop) => [stop.lat, stop.lng] as [number, number]);
  const activeColor =
    highlight === "off-route" ? BRAND.vor : highlight === "diversion" ? BRAND.warn : BRAND.link;

  if (currentIdx > 0 && coords.length >= 2) {
    const completed = coords.slice(0, currentIdx + 1);
    if (completed.length >= 2) {
      L.polyline(completed, {
        color: BRAND.ok,
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    }
  }

  if (currentIdx >= 0 && currentIdx < coords.length - 1) {
    const remaining = coords.slice(currentIdx);
    if (remaining.length >= 2) {
      L.polyline(remaining, {
        color: activeColor,
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        dashArray: highlight === "off-route" ? "8 8" : undefined,
      }).addTo(map);
    }
  }
}

function addRoadRouteLayers(
  L: typeof import("leaflet"),
  map: LeafletMap,
  geometry: [number, number][],
  driverPosition: [number, number] | null,
  highlight: "current" | "diversion" | "off-route",
  mapTheme: MapDisplayFilter = "standard",
) {
  const activeColor =
    highlight === "off-route" ? BRAND.vor : highlight === "diversion" ? BRAND.warn : BRAND.link;
  const onDarkMap = mapTheme === "night";
  const traveledColor = onDarkMap ? "#32d583" : BRAND.ok;
  const activeRouteColor = onDarkMap ? "#5b8fff" : activeColor;
  const lineWeight = onDarkMap ? 7 : 6;
  const { traveled, remaining } = splitGeometryAtDriver(geometry, driverPosition);
  const layers: Polyline[] = [];

  if (traveled.length >= 2) {
    layers.push(
      L.polyline(traveled, {
        color: traveledColor,
        weight: lineWeight,
        opacity: onDarkMap ? 0.95 : 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map),
    );
  }

  if (remaining.length >= 2) {
    layers.push(
      L.polyline(remaining, {
        color: activeRouteColor,
        weight: lineWeight,
        opacity: 0.98,
        lineCap: "round",
        lineJoin: "round",
        dashArray: highlight === "off-route" ? "8 8" : undefined,
      }).addTo(map),
    );
  }

  return layers;
}

function addStopMarkers(L: typeof import("leaflet"), map: LeafletMap, stops: JourneyMapStop[]) {
  for (const stop of stops) {
    const color =
      stop.status === "completed" ? BRAND.ok : stop.status === "current" ? BRAND.link : BRAND.muted;
    const size = stop.status === "current" ? 14 : 10;

    L.marker([stop.lat, stop.lng], {
      icon: markerIcon(L, color, size, stop.status === "current"),
      title: stop.name,
    }).addTo(map);
  }
}

export function JourneyMap({
  dutyId,
  highlight = "current",
  fullBleed = false,
  hideStatusOverlay = false,
  className,
}: {
  dutyId: string;
  highlight?: "current" | "diversion" | "off-route";
  fullBleed?: boolean;
  hideStatusOverlay?: boolean;
  className?: string;
}) {
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  useEnsureJourneyRoute(dutyId);
  const route = useNavigationRoute(dutyId);
  const mapDisplayFilter = useDriverPreferencesStore((s) => s.mapDisplayFilter);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !duty) return;

    const stops = buildJourneyMapStops(duty);
    if (stops.length === 0) return;

    let cancelled = false;
    setMapReady(false);
    setMapError(false);

    void import("leaflet")
      .then((leafletModule) => {
        if (cancelled || !containerRef.current) return;

        const L = leafletModule.default;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
        });

        L.tileLayer(mapTileLayerForFilter(mapDisplayFilter).url, {
          maxZoom: 19,
          attribution: mapTileLayerForFilter(mapDisplayFilter).attribution,
        }).addTo(map);

        const driverPosition = estimateDriverPosition(stops);

        if (route?.geometry && route.geometry.length >= 2) {
          addRoadRouteLayers(L, map, route.geometry, driverPosition, highlight, mapDisplayFilter);
        } else {
          addStraightRouteLayers(L, map, stops, highlight);
        }

        addStopMarkers(L, map, stops);

        if (driverPosition) {
          L.marker(driverPosition, {
            icon: markerIcon(L, BRAND.link, 16, true),
            zIndexOffset: 1000,
            title: "Your vehicle",
          }).addTo(map);
        }

        const boundsPoints: [number, number][] = route?.geometry?.length
          ? route.geometry
          : stops.map((stop) => [stop.lat, stop.lng]);
        const bounds = L.latLngBounds(boundsPoints);
        if (driverPosition) bounds.extend(driverPosition);
        map.fitBounds(bounds.pad(0.18));

        mapRef.current = map;

        requestAnimationFrame(() => {
          map.invalidateSize();
          if (!cancelled) setMapReady(true);
        });
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [duty, dutyId, highlight, route?.geometry, route?.source, mapDisplayFilter]);

  if (!duty || mapError) {
    return <JourneyMapPlaceholder highlight={highlight} fullBleed={fullBleed} className={className} />;
  }

  return (
    <div
      className={cn(
        mapThemeClass(mapDisplayFilter),
        "relative overflow-hidden bg-secondary",
        !fullBleed && "rounded-md",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" aria-label="Route map" role="img" />
      {!mapReady && (
        <JourneyMapPlaceholder highlight={highlight} fullBleed={fullBleed} className="absolute inset-0 z-[400]" />
      )}
      {mapReady && !hideStatusOverlay && <MapStatusOverlay highlight={highlight} />}
    </div>
  );
}
