import { getCommandApiBaseUrl, commandStartDriverMessage, commandSignOffDuty, commandSignOnDuty } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import {
  dequeueOpsCommand,
  enqueueDutyOpsCommand,
  enqueueOpsCommand,
  hasPendingDutyOps,
  loadOpsOutbox,
} from "@/lib/driver-ops-outbox.storage";
import {
  reportDefectViaCommand,
  reportIncidentViaCommand,
  replyDriverMessageViaCommand,
} from "@/services/command-driver-ops.service";

async function accessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function shouldQueueOnFailure(result) {
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

function isPermanentOpsFailure(result) {
  if (result?.ok) return false;
  if (typeof result?.status === "number") {
    return result.status >= 400 && result.status < 500 && result.status !== 429;
  }
  return false;
}

function withClientId(input, clientId) {
  return {
    ...(input ?? {}),
    clientId: input?.clientId ?? clientId ?? `ops-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

function workspaceFrom(driver, session) {
  return resolveDriverWorkspaceScope(driver, session);
}

async function signOnDutyViaCommand(dutyId) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in.", status: 401 };
  return commandSignOnDuty(token, dutyId);
}

async function signOffDutyViaCommand(dutyId) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in.", status: 401 };
  return commandSignOffDuty(token, dutyId);
}

export function countPendingOpsCommands(driverId, companyId, membershipId) {
  return loadOpsOutbox(driverId, companyId, membershipId).length;
}

export function describeOpsOutbox(driverId, companyId, membershipId) {
  const queue = loadOpsOutbox(driverId, companyId, membershipId);
  return {
    total: queue.length,
    defects: queue.filter((item) => item.type === "defect").length,
    incidents: queue.filter((item) => item.type === "incident").length,
    messages: queue.filter((item) => item.type === "message_start" || item.type === "message_reply").length,
    dutySignOn: queue.filter((item) => item.type === "duty_sign_on").length,
    dutySignOff: queue.filter((item) => item.type === "duty_sign_off").length,
  };
}

function queueDutyCommand(driverId, type, dutyId, companyId, membershipId, message) {
  enqueueDutyOpsCommand(driverId, type, dutyId, companyId, membershipId);
  return {
    ok: true,
    queued: true,
    dutyId: String(dutyId),
    message,
  };
}

export async function signOnDutyWithOutbox(driver, session, dutyId) {
  const { companyId, membershipId } = workspaceFrom(driver, session);
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
  const { companyId, membershipId } = workspaceFrom(driver, session);
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
  const { companyId, membershipId } = workspaceFrom(driver, session);
  const driverId = driver?.id;
  if (!driverId) return { ok: false, message: "Driver session missing." };

  const payload = withClientId(input);

  if (isOffline()) {
    enqueueOpsCommand(driverId, { type: "defect", payload }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Defect saved on this device — will reach Command when connection returns.",
    };
  }

  const result = await reportDefectViaCommand(payload);
  if (result.ok) return result;

  if (getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    enqueueOpsCommand(driverId, { type: "defect", payload }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Defect saved on this device — will reach Command when connection returns.",
    };
  }

  return result;
}

export async function submitIncidentWithOutbox(driver, session, input) {
  const { companyId, membershipId } = workspaceFrom(driver, session);
  const driverId = driver?.id;
  if (!driverId) return { ok: false, message: "Driver session missing." };

  const payload = withClientId(input);

  if (isOffline()) {
    enqueueOpsCommand(driverId, { type: "incident", payload }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Incident saved on this device — will reach Command when connection returns.",
    };
  }

  const result = await reportIncidentViaCommand(payload);
  if (result.ok) return result;

  if (getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    enqueueOpsCommand(driverId, { type: "incident", payload }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Incident saved on this device — will reach Command when connection returns.",
    };
  }

  return result;
}

export async function flushOpsOutbox(driver, session) {
  const { companyId, membershipId } = workspaceFrom(driver, session);
  const driverId = driver?.id;
  if (!driverId || isOffline()) {
    return { synced: 0, blocked: 0, remaining: loadOpsOutbox(driverId, companyId, membershipId).length };
  }

  const queue = loadOpsOutbox(driverId, companyId, membershipId);
  let synced = 0;
  let blocked = 0;
  const blockedItems = [];

  for (const item of queue) {
    if (item.companyId && companyId && item.companyId !== companyId) continue;

    let result;
    if (item.type === "incident") {
      result = await reportIncidentViaCommand(item.payload);
    } else if (item.type === "defect") {
      result = await reportDefectViaCommand(item.payload);
    } else if (item.type === "message_start") {
      const token = await accessToken();
      result = token
        ? await commandStartDriverMessage(token, item.payload)
        : { ok: false, message: "Not signed in.", status: 401 };
    } else if (item.type === "message_reply") {
      result = await replyDriverMessageViaCommand(item.payload);
    } else if (item.type === "duty_sign_on") {
      result = await signOnDutyViaCommand(item.payload?.dutyId);
    } else if (item.type === "duty_sign_off") {
      result = await signOffDutyViaCommand(item.payload?.dutyId);
    } else {
      continue;
    }

    if (!result.ok) {
      if (isPermanentOpsFailure(result)) {
        dequeueOpsCommand(driverId, item.id, companyId, membershipId);
        blocked += 1;
        blockedItems.push({
          id: item.id,
          type: item.type,
          message: result.message ?? "Command rejected this report.",
        });
        continue;
      }
      break;
    }

    dequeueOpsCommand(driverId, item.id, companyId, membershipId);
    synced += 1;
  }

  return {
    synced,
    blocked,
    blockedItems,
    remaining: loadOpsOutbox(driverId, companyId, membershipId).length,
  };
}
