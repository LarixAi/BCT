import type { DriverFocusContext, DriverFocusPhase } from "@/types/driver-focus";
import { isActiveOperationalWorkflow } from "./operational-workflow";

const ACTIVE_WORKFLOWS = new Set([
  "vehicle_check",
  "active_run",
  "en_route_pickup",
  "at_pickup",
  "passenger_boarding",
  "en_route_dropoff",
  "passenger_dropoff",
  "navigation",
  "incident",
]);

export function shouldKeepScreenAwake(ctx: DriverFocusContext): boolean {
  if (!ctx.isAuthenticated) return false;
  if (!ctx.settings.enabled) return false;
  if (!ctx.settings.keepScreenAwakeDuringActiveWork) return false;
  if (!ctx.appForeground) return false;
  if (ctx.dutyPaused) return false;
  if (ctx.tripCompleted || ctx.runCompleted) return false;
  if (ctx.dutyLifecycleStatus === "completed" || ctx.dutyLifecycleStatus === "cancelled") return false;

  return ACTIVE_WORKFLOWS.has(ctx.workflow) && isActiveOperationalWorkflow(ctx.workflow);
}

export function shouldShowTripOverlay(ctx: DriverFocusContext): boolean {
  if (!ctx.settings.enabled) return false;
  if (!ctx.settings.automaticallyShowTripOverlay) return false;
  if (!ctx.settings.openOverlayWhenLeavingVeyvio) return false;
  if (ctx.appForeground) return false;
  if (ctx.dutyPaused || ctx.tripCompleted) return false;

  return ACTIVE_WORKFLOWS.has(ctx.workflow) && ctx.workflow !== "vehicle_check";
}

export function shouldTrackLocationInBackground(ctx: DriverFocusContext): boolean {
  if (!ctx.settings.enabled) return false;
  if (ctx.tripCompleted || ctx.dutyLifecycleStatus === "completed") return false;

  return (
    ctx.dutyLifecycleStatus === "in_progress" &&
    (ctx.workflow === "navigation" ||
      ctx.workflow === "en_route_pickup" ||
      ctx.workflow === "en_route_dropoff" ||
      ctx.workflow === "active_run" ||
      ctx.workflow === "at_pickup" ||
      ctx.workflow === "passenger_boarding" ||
      ctx.workflow === "passenger_dropoff")
  );
}

export function shouldPlayOperationalAlerts(ctx: DriverFocusContext): boolean {
  if (!ctx.settings.enabled) return false;
  if (!ctx.settings.audioAlerts && !ctx.settings.vibrationAlerts) return false;
  return isActiveOperationalWorkflow(ctx.workflow);
}

export function shouldShowTripNotification(ctx: DriverFocusContext): boolean {
  if (!ctx.settings.enabled) return false;
  if (ctx.appForeground) return false;
  if (ctx.dutyPaused || ctx.tripCompleted) return false;
  if (ctx.workflow === "idle" || ctx.workflow === "vehicle_check") return false;
  return isActiveOperationalWorkflow(ctx.workflow);
}

export function resolveDriverFocusPhase(ctx: DriverFocusContext): DriverFocusPhase {
  if (!ctx.settings.enabled) return "off";
  if (!ctx.isAuthenticated) return "off";
  if (ctx.tripCompleted || ctx.dutyLifecycleStatus === "completed") return "completing";
  if (ctx.dutyPaused) return "paused";
  if (!isActiveOperationalWorkflow(ctx.workflow)) return "off";

  if (!ctx.appForeground && shouldShowTripOverlay(ctx)) return "background";
  if (ctx.appForeground) return "active";
  return "preparing";
}
