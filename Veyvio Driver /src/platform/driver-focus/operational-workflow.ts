import type { DutyDetail } from "@/types/duty";
import type { DriverFocusContext, OperationalWorkflow } from "@/types/driver-focus";
import { isNavRoute } from "@/domain/driver/nav-routes";

export function deriveRunStatus(duty: DutyDetail | null): string | null {
  if (!duty) return null;
  const activeRun = duty.runs.find((run) => run.status === "active" || run.status === "paused");
  return activeRun?.status ?? duty.runs[0]?.status ?? null;
}

export function deriveOperationalWorkflow(input: {
  duty: DutyDetail | null;
  vehicleCheckInProgress: boolean;
  navigationOpen: boolean;
  dutyPaused: boolean;
  incidentActive?: boolean;
}): OperationalWorkflow {
  if (input.incidentActive) return "incident";
  if (input.dutyPaused) return "duty_paused";
  if (input.vehicleCheckInProgress) return "vehicle_check";
  if (input.navigationOpen) return "navigation";

  const duty = input.duty;
  if (!duty || duty.lifecycleStatus !== "in_progress") return "idle";

  const activeRun = duty.runs.find((run) => run.status === "active" || run.status === "paused");
  if (!activeRun) return "active_run";
  if (activeRun.status === "paused") return "duty_paused";

  const currentStop = activeRun.stops.find(
    (stop) => stop.status === "approaching" || stop.status === "arrived" || stop.status === "in_progress",
  ) ?? activeRun.stops.find((stop) => stop.status === "scheduled");

  if (!currentStop) {
    const allCompleted = activeRun.stops.every((stop) => stop.status === "completed" || stop.status === "skipped");
    return allCompleted ? "idle" : "active_run";
  }

  const boardingTask = currentStop.passengerTasks.find(
    (task) => task.type === "pickup" && (task.status === "scheduled" || task.status === "boarded"),
  );
  const dropoffTask = currentStop.passengerTasks.find(
    (task) => task.type === "dropoff" && task.status !== "dropped_off" && task.status !== "handed_over",
  );

  if (currentStop.status === "approaching") {
    return dropoffTask ? "en_route_dropoff" : "en_route_pickup";
  }

  if (currentStop.status === "arrived" || currentStop.status === "in_progress") {
    if (boardingTask && boardingTask.status === "scheduled") return "at_pickup";
    if (boardingTask && boardingTask.status === "boarded") return "passenger_boarding";
    if (dropoffTask) return "passenger_dropoff";
    return "at_pickup";
  }

  return "active_run";
}

export function buildDriverFocusContext(input: {
  settings: DriverFocusContext["settings"];
  appForeground: boolean;
  pathname: string;
  activeDutyId: string | null;
  duty: DutyDetail | null;
  vehicleCheckInProgress: boolean;
  dutyPaused: boolean;
  isAuthenticated: boolean;
  platform: DriverFocusContext["platform"];
  tripPresentation: DriverFocusContext["tripPresentation"];
}): DriverFocusContext {
  const navigationOpen = isNavRoute(input.pathname);
  const workflow = deriveOperationalWorkflow({
    duty: input.duty,
    vehicleCheckInProgress: input.vehicleCheckInProgress,
    navigationOpen,
    dutyPaused: input.dutyPaused,
  });

  const runCompleted = Boolean(
    input.duty?.runs.length &&
      input.duty.runs.every((run) => run.status === "completed"),
  );
  const tripCompleted = input.duty?.lifecycleStatus === "completed";

  return {
    settings: input.settings,
    workflow,
    appForeground: input.appForeground,
    pathname: input.pathname,
    activeDutyId: input.activeDutyId,
    dutyLifecycleStatus: input.duty?.lifecycleStatus ?? null,
    runStatus: deriveRunStatus(input.duty),
    vehicleCheckInProgress: input.vehicleCheckInProgress,
    navigationOpen,
    dutyPaused: input.dutyPaused,
    tripCompleted,
    runCompleted,
    isAuthenticated: input.isAuthenticated,
    platform: input.platform,
    tripPresentation: input.tripPresentation,
  };
}

export function isActiveOperationalWorkflow(workflow: OperationalWorkflow): boolean {
  return workflow !== "idle" && workflow !== "duty_paused";
}
