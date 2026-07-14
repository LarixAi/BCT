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

export function routeCoordinates(stops: JourneyMapStop[]): [number, number][] {
  return stops.map((stop) => [stop.lat, stop.lng]);
}
