const EARTH_RADIUS_M = 6_371_000;

export function haversineDistanceM(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function deriveSpeedKmh(input: {
  previous?: { latitude: number; longitude: number; recordedAt: string };
  current: { latitude: number; longitude: number; recordedAt: string };
  reportedSpeedMps?: number | null;
}): number | null {
  if (input.reportedSpeedMps != null && input.reportedSpeedMps >= 0) {
    return input.reportedSpeedMps * 3.6;
  }
  if (!input.previous) return null;

  const elapsedMs =
    new Date(input.current.recordedAt).getTime() -
    new Date(input.previous.recordedAt).getTime();
  if (elapsedMs <= 0) return null;

  const distanceM = haversineDistanceM(input.previous, input.current);
  const speedMps = distanceM / (elapsedMs / 1000);
  return speedMps * 3.6;
}

export { shouldEnableDrivingSafetyMode, getDrivingSafetyRestrictions } from "./driving-safety-mode";

export function isSafeDrivingAction(action: DrivingSafetyAction, vehicleMoving: boolean): boolean {
  if (!vehicleMoving) return true;
  return SAFE_WHILE_MOVING.has(action);
}

export type DrivingSafetyAction =
  | "open_navigation"
  | "hear_instruction"
  | "call_dispatch"
  | "report_urgent_problem"
  | "acknowledge_alert"
  | "open_veyvio"
  | "type_message"
  | "mark_passenger_absent"
  | "cancel_stop"
  | "transfer_trip"
  | "read_safeguarding"
  | "submit_incident"
  | "complete_defect";

const SAFE_WHILE_MOVING = new Set<DrivingSafetyAction>([
  "open_navigation",
  "hear_instruction",
  "call_dispatch",
  "report_urgent_problem",
  "acknowledge_alert",
  "open_veyvio",
]);
