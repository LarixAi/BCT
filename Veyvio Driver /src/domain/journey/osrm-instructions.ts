import type { NavStep } from "@/domain/journey/turn-by-turn-types";

interface OsrmManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: OsrmManeuver;
}

interface OsrmLeg {
  steps: OsrmStep[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  legs: OsrmLeg[];
}

export interface OsrmRouteResponse {
  routes: OsrmRoute[];
}

export function parseOsrmRoute(
  response: OsrmRouteResponse,
  destinationName: string,
  dutyId: string,
): { steps: NavStep[]; geometry: [number, number][]; totalDistanceM: number; totalDurationS: number } | null {
  const route = response.routes[0];
  if (!route) return null;

  const steps: NavStep[] = route.legs.flatMap((leg, legIndex) =>
    leg.steps.map((step, stepIndex) => ({
      id: `${legIndex}_${stepIndex}`,
      instruction: formatOsrmInstruction(step),
      streetName: step.name || undefined,
      distanceM: step.distance,
      durationS: step.duration,
      maneuverType: step.maneuver.type,
      modifier: step.maneuver.modifier,
      location: [step.maneuver.location[1], step.maneuver.location[0]],
    })),
  );

  const geometry: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return {
    steps,
    geometry,
    totalDistanceM: route.distance,
    totalDurationS: route.duration,
  };
}

function formatOsrmInstruction(step: OsrmStep): string {
  const street = step.name?.trim() || "the road";
  const { type, modifier } = step.maneuver;

  if (type === "depart") {
    return modifier ? `Head ${modifier.replace(/-/g, " ")} on ${street}` : `Start on ${street}`;
  }
  if (type === "arrive") {
    return `Arrive at ${street}`;
  }
  if (type === "turn" && modifier) {
    return `Turn ${modifier.replace(/-/g, " ")} onto ${street}`;
  }
  if (type === "new name") {
    return `Continue onto ${street}`;
  }
  if (type === "continue") {
    return `Continue on ${street}`;
  }
  if (type === "merge") {
    return modifier ? `Merge ${modifier.replace(/-/g, " ")} onto ${street}` : `Merge onto ${street}`;
  }
  if (type === "roundabout" && modifier) {
    return `At roundabout, take ${modifier.replace(/-/g, " ")} exit onto ${street}`;
  }
  if (type === "rotary" && modifier) {
    return `At rotary, take ${modifier.replace(/-/g, " ")} exit onto ${street}`;
  }
  if (type === "fork" && modifier) {
    return `Keep ${modifier.replace(/-/g, " ")} at fork onto ${street}`;
  }
  if (type === "end of road" && modifier) {
    return `At end of road, turn ${modifier.replace(/-/g, " ")} onto ${street}`;
  }
  if (type === "on ramp") {
    return `Take ramp onto ${street}`;
  }
  if (type === "off ramp") {
    return `Take exit onto ${street}`;
  }

  return street !== "the road" ? `Continue on ${street}` : "Continue on route";
}

/** Pick the step the driver is approaching based on position along the route. */
export function resolveCurrentStepIndex(
  steps: NavStep[],
  geometry: [number, number][],
  driverPosition: [number, number] | null,
): number {
  if (steps.length === 0) return 0;
  if (!driverPosition || geometry.length < 2) {
    return Math.min(1, steps.length - 1);
  }

  const progress = distanceAlongGeometry(geometry, driverPosition);
  let accumulated = 0;

  for (let i = 0; i < steps.length; i++) {
    accumulated += steps[i].distanceM;
    if (accumulated >= progress) {
      return Math.max(0, i);
    }
  }

  return steps.length - 1;
}

function distanceAlongGeometry(geometry: [number, number][], point: [number, number]): number {
  let closestSegment = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < geometry.length - 1; i++) {
    const dist = pointToSegmentDistance(point, geometry[i], geometry[i + 1]);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestSegment = i;
    }
  }

  let along = 0;
  for (let i = 0; i < closestSegment; i++) {
    along += haversineM(geometry[i], geometry[i + 1]);
  }

  return along + haversineM(geometry[closestSegment], point) * 0.35;
}

function pointToSegmentDistance(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): number {
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  if (dx === 0 && dy === 0) return haversineM(point, start);

  const t = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * dy + (point[1] - start[1]) * dx) / (dy * dy + dx * dx)),
  );
  const proj: [number, number] = [start[0] + t * dy, start[1] + t * dx];
  return haversineM(point, proj);
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
