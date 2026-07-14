import { getActiveRun, getHeadingStop } from "@/domain/journey/journey-helpers";
import type { DutyDetail } from "@/types/duty";
import type { OperationalWorkflow } from "@/types/driver-focus";
import type { TripOverlayPayload } from "./adapters/stub-adapters";

function streetLabel(stopName: string): string {
  return stopName.split("—")[0]?.trim() || stopName;
}

function passengerProgressLabel(duty: DutyDetail): string {
  const run = getActiveRun(duty);
  if (!run) return "—";

  const pickupTasks = run.stops.flatMap((stop) =>
    stop.passengerTasks.filter((task) => task.type === "pickup"),
  );
  if (pickupTasks.length === 0) return "—";

  const completed = pickupTasks.filter(
    (task) => task.status === "boarded" || task.status === "dropped_off" || task.status === "handed_over",
  ).length;

  return `${completed} of ${pickupTasks.length} completed`;
}

function accessibilityIndicator(duty: DutyDetail): string | undefined {
  const run = getActiveRun(duty);
  const stop = getHeadingStop(duty);
  const hasNotes = run?.stops.some((s) =>
    s.passengerTasks.some((task) => Boolean(task.accessibilityNotes)),
  );
  if (!hasNotes) return undefined;
  return stop?.passengerTasks.some((task) => task.requiresEscort)
    ? "Escort required"
    : "Accessibility boarding";
}

function tripStateLabel(workflow: OperationalWorkflow, dutyPaused: boolean): string {
  if (dutyPaused) return "Trip paused";
  const labels: Record<OperationalWorkflow, string> = {
    idle: "Trip in progress",
    vehicle_check: "Vehicle check in progress",
    active_run: "Trip in progress",
    en_route_pickup: "Travelling to pickup",
    at_pickup: "Waiting at pickup",
    passenger_boarding: "Passenger boarding",
    en_route_dropoff: "Travelling to destination",
    passenger_dropoff: "Passenger drop-off",
    navigation: "Trip in progress",
    incident: "Incident workflow",
    duty_paused: "Trip paused",
  };
  return labels[workflow];
}

export function buildTripOverlayPayload(input: {
  duty: DutyDetail;
  dutyId: string;
  workflow: OperationalWorkflow;
  dutyPaused: boolean;
  etaLabel?: string;
  distanceLabel?: string;
  hasNewInstruction?: boolean;
}): TripOverlayPayload {
  const stop = getHeadingStop(input.duty);
  return {
    dutyId: input.dutyId,
    tripStateLabel: tripStateLabel(input.workflow, input.dutyPaused),
    nextStopLabel: stop ? streetLabel(stop.name) : "Next stop",
    etaLabel: input.etaLabel ?? "—",
    distanceLabel: input.distanceLabel ?? "—",
    passengerProgressLabel: passengerProgressLabel(input.duty),
    accessibilityIndicator: accessibilityIndicator(input.duty),
    hasNewInstruction: input.hasNewInstruction ?? false,
  };
}
