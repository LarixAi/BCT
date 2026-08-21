/**
 * F-08 — persist duty navigation steps on Command before local progress cache.
 * Pickup/dropoff confirmations stay local attestations; arrive/complete hit the server.
 */
import { getCommandApiBaseUrl } from "@/lib/command-api";
import {
  applyDutyNavAction,
  validateDutyNavAction,
} from "@/lib/command-duty-nav-job";
import {
  arriveJourneyStop,
  completeJourney,
  completeJourneyStop,
  startJourney,
} from "@/services/command-driver-ops.service";

function stopServerInput(stop) {
  if (!stop) return {};
  return {
    sequence: Number(stop.stopOrder ?? stop.sequence ?? 1),
    label: String(stop.label ?? stop.shortLabel ?? stop.address ?? "Stop"),
  };
}

async function ensureJourneyStarted(journeyId) {
  const result = await startJourney(journeyId);
  if (result.ok) return result;
  const message = String(result.message ?? "").toLowerCase();
  if (message.includes("already") || message.includes("in_progress")) {
    return { ok: true, alreadyStarted: true };
  }
  return result;
}

/**
 * @param {object} duty Command bootstrap duty
 * @param {string} action Duty nav action from job execution state
 * @param {{ forceLocal?: boolean }} [opts]
 */
export async function applyDutyNavActionAsync(duty, action, opts = {}) {
  const validation = validateDutyNavAction(duty, action);
  if (!validation.ok) return validation;

  const localOnly =
    opts.forceLocal ||
    !getCommandApiBaseUrl() ||
    !validation.journeyId ||
    action === "confirm_pickup" ||
    action === "confirm_dropoff";

  if (localOnly) {
    return applyDutyNavAction(duty, action);
  }

  const journeyId = validation.journeyId;
  const stopInput = stopServerInput(validation.currentStop);
  let server;

  if (action === "start") {
    server = await ensureJourneyStarted(journeyId);
  } else if (action === "arrive") {
    const started = await ensureJourneyStarted(journeyId);
    if (!started.ok) {
      return {
        ok: false,
        message: started.message ?? "Journey could not be started on Command.",
        job: validation.job,
        serverRejected: true,
      };
    }
    server = await arriveJourneyStop(journeyId, stopInput);
  } else if (action === "complete_stop" || action === "complete_job") {
    const started = await ensureJourneyStarted(journeyId);
    if (!started.ok) {
      return {
        ok: false,
        message: started.message ?? "Journey could not be started on Command.",
        job: validation.job,
        serverRejected: true,
      };
    }
    server = await completeJourneyStop(journeyId, {
      ...stopInput,
      outcome:
        validation.currentStop?.stopType === "pickup"
          ? "pickup_complete"
          : validation.currentStop?.stopType === "dropoff"
            ? "dropoff_complete"
            : "stop_complete",
    });
    if (server.ok && validation.allDoneAfter) {
      const journeyComplete = await completeJourney(journeyId, {
        outcome: "duty_stops_complete",
      });
      if (!journeyComplete.ok) {
        return {
          ok: false,
          message: journeyComplete.message ?? "Stops finished but journey could not be closed on Command.",
          job: validation.job,
        };
      }
    }
  } else {
    return applyDutyNavAction(duty, action);
  }

  if (!server?.ok) {
    return {
      ok: false,
      message: server?.message ?? "Command could not record this step. Check connection and try again.",
      job: validation.job,
      serverRejected: true,
    };
  }

  return applyDutyNavAction(duty, action);
}
