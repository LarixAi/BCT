/**
 * F-15 — queue duty journey steps when offline; flush via driver ops outbox.
 */
import { getCommandApiBaseUrl } from "@/lib/command-api";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";
import { applyDutyNavAction, validateDutyNavAction } from "@/lib/command-duty-nav-job";
import { applyDutyNavActionAsync } from "@/lib/command-duty-nav-server";

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function needsServerSync(action) {
  return action !== "confirm_pickup" && action !== "confirm_dropoff";
}

function journeyQueueType(action) {
  if (action === "start") return "journey_start";
  if (action === "arrive") return "journey_stop_arrive";
  if (action === "complete_stop" || action === "complete_job") return "journey_stop_complete";
  return null;
}

function buildJourneyPayload(duty, action, validation) {
  const stop = validation.currentStop;
  const stopInput = stop
    ? {
        sequence: Number(stop.stopOrder ?? stop.sequence ?? 1),
        label: String(stop.label ?? stop.shortLabel ?? stop.address ?? "Stop"),
      }
    : {};
  return {
    dutyId: String(duty.id),
    journeyId: validation.journeyId,
    action,
    stopInput,
    completeJourney: Boolean(validation.allDoneAfter),
    outcome:
      stop?.stopType === "pickup"
        ? "pickup_complete"
        : stop?.stopType === "dropoff"
          ? "dropoff_complete"
          : "stop_complete",
    clientId: `journey-${duty.id}-${action}-${stop?.id ?? "start"}-${Date.now()}`,
  };
}

/**
 * @param {object} duty
 * @param {string} action
 * @param {{ driver?: object, session?: object, forceLocal?: boolean }} [opts]
 */
export async function applyDutyNavActionWithOutbox(duty, action, opts = {}) {
  const validation = validateDutyNavAction(duty, action);
  if (!validation.ok) return validation;

  const driver = opts.driver;
  const session = opts.session;
  const scope = driver ? resolveDriverWorkspaceScope(driver, session) : null;
  const driverId = driver?.id;
  const { companyId, membershipId } = scope ?? {};

  if (
    !opts.forceLocal &&
    getCommandApiBaseUrl() &&
    validation.journeyId &&
    needsServerSync(action) &&
    driverId &&
    isOffline()
  ) {
    const type = journeyQueueType(action);
    if (type) {
      enqueueOpsCommand(
        driverId,
        { type, payload: buildJourneyPayload(duty, action, validation) },
        companyId,
        membershipId,
      );
      const local = applyDutyNavAction(duty, action);
      return {
        ...local,
        queued: true,
        message:
          local.message +
          " Saved on this device — Command will record it when connection returns.",
      };
    }
  }

  if (!opts.forceLocal && getCommandApiBaseUrl() && validation.journeyId && needsServerSync(action)) {
    return applyDutyNavActionAsync(duty, action);
  }

  return applyDutyNavAction(duty, action);
}
