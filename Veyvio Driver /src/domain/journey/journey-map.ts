import type { DutyDetail } from "@/types/duty";
import { getActiveRun, getCurrentStopIndex } from "@/domain/journey/journey-helpers";

export type JourneyMapStopStatus = "completed" | "current" | "upcoming";

export interface JourneyMapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: JourneyMapStopStatus;
}

export function buildJourneyMapStops(duty: DutyDetail): JourneyMapStop[] {
  const run = getActiveRun(duty);
  if (!run) return [];

  const currentIdx = getCurrentStopIndex(run.stops);

  return run.stops.map((stop, index) => ({
    id: stop.id,
    name: stop.name.split("—")[0]?.trim() ?? stop.name,
    lat: stop.latitude,
    lng: stop.longitude,
    status: index < currentIdx ? "completed" : index === currentIdx ? "current" : "upcoming",
  }));
}

/** Approximate vehicle position between the last completed stop and the heading stop. */
export function estimateDriverPosition(stops: JourneyMapStop[]): [number, number] | null {
  if (stops.length === 0) return null;

  const currentIdx = stops.findIndex((stop) => stop.status === "current");
  if (currentIdx <= 0) {
    const first = stops[0];
    return [first.lat, first.lng];
  }

  const previous = stops[currentIdx - 1];
  const current = stops[currentIdx];
  const progress = 0.68;

  return [
    previous.lat + (current.lat - previous.lat) * progress,
    previous.lng + (current.lng - previous.lng) * progress,
  ];
}

/**
 * Prefer live / custom geolocation (device GPS or Chrome Sensors override)
 * when it is near the duty. Otherwise keep the duty-stop estimate so mock
 * Wembley duties are not yanked to a developer’s real location.
 */
export function resolveDriverPosition(
  estimated: [number, number] | null,
  live?: { latitude: number; longitude: number } | null,
  opts?: { maxDistanceM?: number },
): [number, number] | null {
  if (
    live &&
    Number.isFinite(live.latitude) &&
    Number.isFinite(live.longitude)
  ) {
    const livePos: [number, number] = [live.latitude, live.longitude];
    if (!estimated) return livePos;
    const maxDistanceM = opts?.maxDistanceM ?? 80_000;
    if (haversineMetres(estimated, livePos) <= maxDistanceM) {
      return livePos;
    }
  }
  return estimated;
}

function haversineMetres(a: [number, number], b: [number, number]): number {
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

export function routeCoordinates(stops: JourneyMapStop[]): [number, number][] {
  return stops.map((stop) => [stop.lat, stop.lng]);
}
