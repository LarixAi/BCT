import { getCommandApiBaseUrl, commandStartDriverMessage, commandSignOffDuty, commandSignOnDuty, commandPostDriverVehicleParked, commandSubmitDutyCloseout, commandCreateVehicleSwapRequest, commandRecordJobExecution } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  dequeueOpsCommand,
  enqueueDutyOpsCommand,
  enqueueOpsCommand,
  hasPendingDutyOps,
  loadOpsOutbox,
  markOpsCommandReconciliation,
  markOpsCommandRetryable,
} from "@/lib/driver-ops-outbox.storage";
import { requireDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import {
  arriveJourneyStop,
  completeJourney,
  completeJourneyStop,
  reportDefectViaCommand,
  reportIncidentViaCommand,
  replyDriverMessageViaCommand,
  startJourney,
} from "@/services/command-driver-ops.service";

async function accessToken(session) {
  if (session?.accessToken || session?.access_token) {
    return session.accessToken ?? session.access_token;
  }
  const supabase = getSupabaseClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  return authSession?.access_token ?? null;
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function shouldQueueOnFailure(result) {
  const message = String(result?.message ?? "").toLowerCase();
  if (typeof result?.status === "number") {
    if (result.status >= 500) return true;
    if (result.status === 429) return true;
    if (result.status >= 400 && result.status < 500) return false;
  }
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("timeout")
  );
}

export function isPermanentOpsFailure(result) {
  if (result?.ok) return false;
  if (typeof result?.status === "number") {
    // 401 means the session expired mid-shift, not that Command rejected the
    // report — never treat it as permanent. Dropping a defect/incident here
    // would silently lose a safety report instead of retrying after refresh.
    if (result.status === 401) return false;
    return result.status >= 400 && result.status < 500 && result.status !== 429;
  }
  return false;
}

async function tryRefreshSession(session) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data?.session?.access_token) return null;
    return { ...(session ?? {}), accessToken: data.session.access_token, access_token: data.session.access_token };
  } catch {
    return null;
  }
}

function withClientId(input, clientId) {
  return {
    ...(input ?? {}),
    clientId: input?.clientId ?? clientId ?? `ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

function persistFailure(error) {
  return {
    ok: false,
    queued: false,
    code: error?.code ?? "OFFLINE_STORAGE_WRITE_FAILED",
    message: error?.message ?? "Could not save this action on the device.",
  };
}

function workspaceFrom(driver, session) {
  return requireDriverWorkspaceScope(driver, session);
}

async function signOnDutyViaCommand(dutyId, session) {
  const token = await accessToken(session);
  if (!token) return { ok: false, message: "Not signed in.", status: 401 };
  return commandSignOnDuty(token, dutyId);
}

async function signOffDutyViaCommand(dutyId, session) {
  const token = await accessToken(session);
  if (!token) return { ok: false, message: "Not signed in.", status: 401 };
  return commandSignOffDuty(token, dutyId);
}

export async function countPendingOpsCommands(driverId, companyId, membershipId) {
  return (await loadOpsOutbox(driverId, companyId, membershipId)).length;
}

export async function describeOpsOutbox(driverId, companyId, membershipId) {
  const queue = await loadOpsOutbox(driverId, companyId, membershipId);
  return {
    total: queue.length,
    defects: queue.filter((item) => item.type === "defect").length,
    incidents: queue.filter((item) => item.type === "incident").length,
    messages: queue.filter((item) => item.type === "message_start" || item.type === "message_reply").length,
    dutySignOn: queue.filter((item) => item.type === "duty_sign_on").length,
    dutySignOff: queue.filter((item) => item.type === "duty_sign_off").length,
    journeySteps: queue.filter((item) => String(item.type ?? "").startsWith("journey_")).length,
    handbacks: queue.filter((item) => item.type === "handback").length,
    dutyCloseouts: queue.filter((item) => item.type === "duty_closeout").length,
    vehicleSwapRequests: queue.filter((item) => item.type === "vehicle_swap_request").length,
    jobExecution: queue.filter((item) => item.type === "job_execution").length,
  };
}

async function persistQueuedCommand(driverId, entry, companyId, membershipId, message) {
  try {
    await enqueueOpsCommand(driverId, entry, companyId, membershipId);
  } catch (error) {
    return persistFailure(error);
  }
  return { ok: true, queued: true, message };
}

async function queueDutyCommand(driverId, type, dutyId, companyId, membershipId, message) {
  try {
    await enqueueDutyOpsCommand(driverId, type, dutyId, companyId, membershipId);
  } catch (error) {
    return persistFailure(error);
  }
  return {
    ok: true,
    queued: true,
    dutyId: String(dutyId),
    message,
  };
}

export async function signOnDutyWithOutbox(driver, session, dutyId) {
  let companyId;
  let membershipId;
  try {
    ;({ companyId, membershipId } = workspaceFrom(driver, session));
  } catch (error) {
    return persistFailure(error);
  }
  const driverId = driver?.id;
  if (!driverId) return { ok: false, message: "Driver session missing." };
  if (!dutyId) return { ok: false, message: "Duty is missing." };

  if (isOffline()) {
    return queueDutyCommand(
      driverId,
      "duty_sign_on",
      dutyId,
      companyId,
      membershipId,
      "Sign-on saved on this device — Command will apply it when connection returns.",
    );
  }

  const result = await signOnDutyViaCommand(dutyId);
  if (result.ok) return result;

  if (getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    return queueDutyCommand(
      driverId,
      "duty_sign_on",
      dutyId,
      companyId,
      membershipId,
      "Sign-on saved on this device — Command will apply it when connection returns.",
    );
  }

  return result;
}

export async function signOffDutyWithOutbox(driver, session, dutyId) {
  let companyId;
  let membershipId;
  try {
    ;({ companyId, membershipId } = workspaceFrom(driver, session));
  } catch (error) {
    return persistFailure(error);
  }
  const driverId = driver?.id;
  if (!driverId) return { ok: false, message: "Driver session missing." };
  if (!dutyId) return { ok: false, message: "Duty is missing." };

  if (isOffline()) {
    return queueDutyCommand(
      driverId,
      "duty_sign_off",
      dutyId,
      companyId,
      membershipId,
      "Sign-off saved on this device — Command will close the duty when connection returns.",
    );
  }

  const result = await signOffDutyViaCommand(dutyId);
  if (result.ok) return result;

  if (getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    return queueDutyCommand(
      driverId,
      "duty_sign_off",
      dutyId,
      companyId,
      membershipId,
      "Sign-off saved on this device — Command will close the duty when connection returns.",
    );
  }

  return result;
}

export { hasPendingDutyOps };

export async function submitDefectWithOutbox(driver, session, input) {
  let companyId;
  let membershipId;
  try {
    ;({ companyId, membershipId } = workspaceFrom(driver, session));
  } catch (error) {
    return persistFailure(error);
  }
  const driverId = driver?.id;
  if (!driverId) return { ok: false, message: "Driver session missing." };

  const payload = withClientId(input);

  if (isOffline()) {
    return persistQueuedCommand(
      driverId,
      { type: "defect", payload },
      companyId,
      membershipId,
      "Defect saved on this device — will reach Command when connection returns.",
    );
  }

  const result = await reportDefectViaCommand(payload);
  if (result.ok) return result;

  if (getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    return persistQueuedCommand(
      driverId,
      { type: "defect", payload },
      companyId,
      membershipId,
      "Defect saved on this device — will reach Command when connection returns.",
    );
  }

  return result;
}

export async function submitIncidentWithOutbox(driver, session, input) {
  let companyId;
  let membershipId;
  try {
    ;({ companyId, membershipId } = workspaceFrom(driver, session));
  } catch (error) {
    return persistFailure(error);
  }
  const driverId = driver?.id;
  if (!driverId) return { ok: false, message: "Driver session missing." };

  const payload = withClientId(input);

  if (isOffline()) {
    return persistQueuedCommand(
      driverId,
      { type: "incident", payload },
      companyId,
      membershipId,
      "Incident saved on this device — will reach Command when connection returns.",
    );
  }

  const result = await reportIncidentViaCommand(payload);
  if (result.ok) return result;

  if (getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    return persistQueuedCommand(
      driverId,
      { type: "incident", payload },
      companyId,
      membershipId,
      "Incident saved on this device — will reach Command when connection returns.",
    );
  }

  return result;
}

async function flushJourneyOpsItem(item) {
  const payload = item.payload ?? {};
  const journeyId = payload.journeyId;
  if (!journeyId) return { ok: false, message: "Journey id missing from queued step.", status: 400 };

  if (item.type === "journey_start") {
    return startJourney(journeyId);
  }

  const stopInput = payload.stopInput ?? {};

  if (item.type === "journey_stop_arrive") {
    const started = await startJourney(journeyId);
    if (!started.ok) {
      const message = String(started.message ?? "").toLowerCase();
      if (!message.includes("already") && !message.includes("in_progress")) return started;
    }
    return arriveJourneyStop(journeyId, stopInput);
  }

  if (item.type === "journey_stop_complete") {
    const started = await startJourney(journeyId);
    if (!started.ok) {
      const message = String(started.message ?? "").toLowerCase();
      if (!message.includes("already") && !message.includes("in_progress")) return started;
    }
    const completeStop = await completeJourneyStop(journeyId, {
      ...stopInput,
      outcome: payload.outcome ?? "stop_complete",
    });
    if (!completeStop.ok) return completeStop;
    if (payload.completeJourney) {
      return completeJourney(journeyId, { outcome: "duty_stops_complete" });
    }
    return completeStop;
  }

  return { ok: false, message: "Unknown journey queue type.", status: 400 };
}

async function runOpsItem(item, session) {
  if (item.type === "incident") {
    return reportIncidentViaCommand(item.payload);
  }
  if (item.type === "defect") {
    return reportDefectViaCommand(item.payload);
  }
  if (item.type === "message_start") {
    const token = await accessToken(session);
    return token
      ? commandStartDriverMessage(token, item.payload)
      : { ok: false, message: "Not signed in.", status: 401 };
  }
  if (item.type === "message_reply") {
    return replyDriverMessageViaCommand(item.payload);
  }
  if (item.type === "handback") {
    const token = await accessToken(session);
    return token
      ? commandPostDriverVehicleParked(token, item.payload)
      : { ok: false, message: "Not signed in.", status: 401 };
  }
  if (item.type === "duty_sign_on") {
    return signOnDutyViaCommand(item.payload?.dutyId, session);
  }
  if (item.type === "duty_sign_off") {
    return signOffDutyViaCommand(item.payload?.dutyId, session);
  }
  if (item.type === "duty_closeout") {
    const token = await accessToken(session);
    return token
      ? commandSubmitDutyCloseout(token, item.payload)
      : { ok: false, message: "Not signed in.", status: 401 };
  }
  if (item.type === "vehicle_swap_request") {
    const token = await accessToken(session);
    return token
      ? commandCreateVehicleSwapRequest(token, item.payload)
      : { ok: false, message: "Not signed in.", status: 401 };
  }
  if (item.type === "job_execution") {
    const token = await accessToken(session);
    return token
      ? commandRecordJobExecution(token, item.payload)
      : { ok: false, message: "Not signed in.", status: 401 };
  }
  if (String(item.type ?? "").startsWith("journey_")) {
    return flushJourneyOpsItem(item);
  }
  return null;
}

export async function flushOpsOutbox(driver, session) {
  let companyId;
  let membershipId;
  try {
    ;({ companyId, membershipId } = workspaceFrom(driver, session));
  } catch {
    return { synced: 0, blocked: 0, remaining: 0, blockedItems: [] };
  }
  const driverId = driver?.id;
  if (!driverId || isOffline()) {
    const remaining = driverId ? (await loadOpsOutbox(driverId, companyId, membershipId)).length : 0;
    return { synced: 0, blocked: 0, remaining, blockedItems: [] };
  }

  const queue = await loadOpsOutbox(driverId, companyId, membershipId);
  let synced = 0;
  let blocked = 0;
  const blockedItems = [];
  let refreshedSession = null;
  let refreshAttempted = false;

  for (const item of queue) {
    if (item.companyId && companyId && item.companyId !== companyId) continue;

    let result = await runOpsItem(item, refreshedSession ?? session);
    if (result === null) continue;

    if (!result.ok && result.status === 401 && !refreshAttempted) {
      refreshAttempted = true;
      refreshedSession = await tryRefreshSession(refreshedSession ?? session);
      if (refreshedSession) {
        result = await runOpsItem(item, refreshedSession);
      }
    }

    if (!result.ok) {
      if (isPermanentOpsFailure(result)) {
        await markOpsCommandReconciliation(driverId, item.id, companyId, membershipId, {
          status: result.status,
          code: result.code ?? null,
          message: result.message ?? "Command rejected this report.",
        });
        blocked += 1;
        blockedItems.push({
          id: item.id,
          type: item.type,
          message: result.message ?? "Command rejected this report. It remains on this device for reconciliation.",
        });
        continue;
      }
      await markOpsCommandRetryable(driverId, item.id, companyId, membershipId, {
        status: result.status,
        message: result.message ?? "Retry later",
      });
      break;
    }

    await dequeueOpsCommand(driverId, item.id, companyId, membershipId);
    synced += 1;
  }

  return {
    synced,
    blocked,
    blockedItems,
    remaining: (await loadOpsOutbox(driverId, companyId, membershipId)).length,
  };
}
