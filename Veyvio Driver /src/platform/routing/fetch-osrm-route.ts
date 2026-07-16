import type { DutyDetail } from "@/types/duty";
import type { JourneyRoute } from "@/domain/journey/turn-by-turn-types";
import {
  buildJourneyMapStops,
  estimateDriverPosition,
  resolveDriverPosition,
} from "@/domain/journey/journey-map";
import { buildStopFingerprint } from "@/domain/journey/navigation-fingerprint";
import type { NavigationRouteFilter } from "@/types/driver-filters";
import { osrmExcludeForRouteFilter } from "@/types/driver-filters";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { parseOsrmRoute, type OsrmRouteResponse } from "@/domain/journey/osrm-instructions";
import { useVehicleMotionStore } from "@/store/vehicle-motion";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

type Waypoint = { lat: number; lng: number; label?: string };

function waypointsToPath(waypoints: Waypoint[]): string {
  return waypoints.map((point) => `${point.lng},${point.lat}`).join(";");
}

function buildFallbackRoute(
  dutyId: string,
  waypoints: Waypoint[],
  destinationName: string,
  stopFingerprint: string,
): JourneyRoute {
  const geometry: [number, number][] = waypoints.map((point) => [point.lat, point.lng]);
  const destination = waypoints[waypoints.length - 1];
  const steps = [
    {
      id: "fallback_0",
      instruction: `Head toward ${destinationName}`,
      streetName: destinationName,
      distanceM: 800,
      durationS: 120,
      maneuverType: "depart",
      location: [waypoints[0]?.lat ?? 0, waypoints[0]?.lng ?? 0] as [number, number],
    },
    {
      id: "fallback_1",
      instruction: `Continue on route to ${destinationName}`,
      streetName: destinationName,
      distanceM: 600,
      durationS: 90,
      maneuverType: "continue",
      location: [
        (waypoints[0].lat + destination.lat) / 2,
        (waypoints[0].lng + destination.lng) / 2,
      ] as [number, number],
    },
    {
      id: "fallback_2",
      instruction: `Arrive at ${destinationName}`,
      streetName: destinationName,
      distanceM: 200,
      durationS: 60,
      maneuverType: "arrive",
      location: [destination.lat, destination.lng] as [number, number],
    },
  ];

  return {
    dutyId,
    stopFingerprint,
    steps,
    geometry,
    totalDistanceM: 1600,
    totalDurationS: 270,
    destinationName,
    source: "fallback",
  };
}

async function fetchOsrmRoute(
  waypoints: Waypoint[],
  routeFilter: NavigationRouteFilter,
): Promise<OsrmRouteResponse | null> {
  if (waypoints.length < 2) return null;

  const exclude = osrmExcludeForRouteFilter(routeFilter);
  const excludeParam = exclude ? `&exclude=${exclude}` : "";
  const url = `${OSRM_BASE}/${waypointsToPath(waypoints)}?overview=full&geometries=geojson&steps=true&annotations=false${excludeParam}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as OsrmRouteResponse;
  } catch {
    return null;
  }
}

export async function fetchJourneyRoute(
  duty: DutyDetail,
  dutyId: string,
  routeFilter: NavigationRouteFilter = "fastest",
): Promise<JourneyRoute> {
  const stopFingerprint = buildStopFingerprint(duty);
  const stops = buildJourneyMapStops(duty);
  const heading = getHeadingStop(duty);
  const destinationName = heading?.name.split("—")[0]?.trim() ?? "Next stop";
  const live = useVehicleMotionStore.getState().lastPosition;
  const driverPosition = resolveDriverPosition(estimateDriverPosition(stops), live);

  const remainingStops = stops.filter((stop) => stop.status === "current" || stop.status === "upcoming");
  const waypoints: Waypoint[] = [];

  if (driverPosition) {
    waypoints.push({ lat: driverPosition[0], lng: driverPosition[1], label: "Vehicle" });
  }

  for (const stop of remainingStops) {
    const last = waypoints[waypoints.length - 1];
    if (last && last.lat === stop.lat && last.lng === stop.lng) continue;
    waypoints.push({ lat: stop.lat, lng: stop.lng, label: stop.name });
  }

  if (waypoints.length < 2) {
    return buildFallbackRoute(
      dutyId,
      waypoints.length ? waypoints : [{ lat: 51.45, lng: -2.59 }],
      destinationName,
      stopFingerprint,
    );
  }

  const osrm = await fetchOsrmRoute(waypoints, routeFilter);
  const parsed = osrm ? parseOsrmRoute(osrm, destinationName, dutyId) : null;

  if (parsed) {
    return {
      dutyId,
      stopFingerprint,
      ...parsed,
      destinationName,
      source: "osrm",
    };
  }

  return buildFallbackRoute(dutyId, waypoints, destinationName, stopFingerprint);
}
