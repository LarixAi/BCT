export interface NavStep {
  id: string;
  instruction: string;
  streetName?: string;
  distanceM: number;
  durationS: number;
  maneuverType: string;
  modifier?: string;
  /** [latitude, longitude] */
  location: [number, number];
}

export interface JourneyRoute {
  dutyId: string;
  stopFingerprint: string;
  steps: NavStep[];
  /** Road-following path as [lat, lng] pairs for map display. */
  geometry: [number, number][];
  totalDistanceM: number;
  totalDurationS: number;
  destinationName: string;
  source: "osrm" | "fallback";
}

export function formatNavDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
}

export function formatNavDuration(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} h ${rem} min` : `${hours} h`;
}

export function formatNavEta(seconds: number): string {
  const arrival = new Date(Date.now() + seconds * 1000);
  return arrival.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
