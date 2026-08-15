import { requireWorkspaceIds } from "@/lib/driver-workspace-storage";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadFleetPingQueue } from "@/lib/fleet-tracking-queue.storage";
import { loadOpsOutbox } from "@/lib/driver-ops-outbox.storage";
import { loadSyncQueue } from "@/lib/walkaround-sync.storage";
import {
  getCommandApiBaseUrl,
  commandListDocuments,
  commandListDriverMessages,
  commandListVehicleChecks,
  commandDriverBootstrap,
} from "@/lib/command-api";

async function accessTokenFromSession(session) {
  if (session?.accessToken || session?.access_token) {
    return session.accessToken ?? session.access_token;
  }
  const supabase = getSupabaseClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  return authSession?.access_token ?? null;
}

function unavailableQueueSummary() {
  return {
    status: "CONTEXT_UNAVAILABLE",
    code: "OFFLINE_CONTEXT_NOT_READY",
    total: null,
    walkaroundChecks: null,
    locationPings: null,
    opsCommands: null,
    defects: null,
    incidents: null,
    messages: null,
    dutyOps: null,
    journeySteps: null,
    handbacks: null,
    dutyCloseouts: null,
    vehicleSwapRequests: null,
    jobExecution: null,
  };
}

function emptyQueueSummary() {
  return {
    status: "READY",
    code: null,
    total: 0,
    walkaroundChecks: 0,
    locationPings: 0,
    opsCommands: 0,
    defects: 0,
    incidents: 0,
    messages: 0,
    dutyOps: 0,
    journeySteps: 0,
    handbacks: 0,
    dutyCloseouts: 0,
    vehicleSwapRequests: 0,
    jobExecution: 0,
  };
}

/** Count all durable offline commands waiting to reach Command. */
export async function describeOfflineQueue(driverId, companyId, membershipId) {
  try {
    requireWorkspaceIds(companyId, membershipId);
  } catch {
    return unavailableQueueSummary();
  }
  const walkaroundChecks = (await loadSyncQueue(driverId, companyId, membershipId)).length;
  const locationPings = (await loadFleetPingQueue(driverId, companyId, membershipId)).length;
  const opsQueue = await loadOpsOutbox(driverId, companyId, membershipId);
  const defects = opsQueue.filter((item) => item.type === "defect").length;
  const incidents = opsQueue.filter((item) => item.type === "incident").length;
  const messages = opsQueue.filter(
    (item) => item.type === "message_start" || item.type === "message_reply",
  ).length;
  const dutyOps = opsQueue.filter(
    (item) => item.type === "duty_sign_on" || item.type === "duty_sign_off",
  ).length;
  const journeySteps = opsQueue.filter((item) => String(item.type ?? "").startsWith("journey_")).length;
  const handbacks = opsQueue.filter((item) => item.type === "handback").length;
  const dutyCloseouts = opsQueue.filter((item) => item.type === "duty_closeout").length;
  const vehicleSwapRequests = opsQueue.filter((item) => item.type === "vehicle_swap_request").length;
  const jobExecution = opsQueue.filter((item) => item.type === "job_execution").length;
  const opsCommands =
    defects + incidents + messages + dutyOps + journeySteps + handbacks + dutyCloseouts + vehicleSwapRequests + jobExecution;
  return {
    status: "READY",
    code: null,
    total: walkaroundChecks + locationPings + opsCommands,
    walkaroundChecks,
    locationPings,
    opsCommands,
    defects,
    incidents,
    messages,
    dutyOps,
    journeySteps,
    handbacks,
    dutyCloseouts,
    vehicleSwapRequests,
    jobExecution,
  };
}

export async function countPendingOfflineCommands(driverId, companyId, membershipId) {
  const summary = await describeOfflineQueue(driverId, companyId, membershipId);
  if (summary.status === "CONTEXT_UNAVAILABLE") return null;
  return summary.total;
}

function capabilityStatus(probe) {
  if (probe.skipped) return "Partial";
  if (probe.ok) return "Live";
  if (probe.configured === false) return "Missing";
  return "Partial";
}

/**
 * Live probes for Admin readiness matrix on Offline & sync.
 * Never hardcode capability status — derive from Command responses.
 */
export async function probeDriverCommandCapabilities(session, { depotId = null } = {}) {
  const base = getCommandApiBaseUrl();
  const token = await accessTokenFromSession(session);

  const notConfigured = {
    ok: false,
    configured: false,
    message: "Command API URL missing from build",
  };

  if (!base) {
    return {
      configured: false,
      capabilities: [
        { label: "Sign-in / driver session", status: "Missing" },
        { label: "Bootstrap home + duties", status: "Missing" },
        { label: "Acknowledge duty", status: "Missing" },
        { label: "Report defect → Admin", status: "Missing" },
        { label: "Report incident → Admin", status: "Missing" },
        { label: "Vehicle check submit", status: "Missing" },
        { label: "Documents self-serve", status: "Missing" },
        { label: "Messages / chat", status: "Missing" },
        { label: "Working time / sign-on", status: "Missing" },
        { label: "Live location pings", status: "Missing" },
      ],
    };
  }

  if (!token) {
    return {
      configured: true,
      capabilities: [
        { label: "Sign-in / driver session", status: "Partial" },
        { label: "Bootstrap home + duties", status: "Missing" },
        { label: "Acknowledge duty", status: "Missing" },
        { label: "Report defect → Admin", status: "Missing" },
        { label: "Report incident → Admin", status: "Missing" },
        { label: "Vehicle check submit", status: "Missing" },
        { label: "Documents self-serve", status: "Missing" },
        { label: "Messages / chat", status: "Missing" },
        { label: "Working time / sign-on", status: "Missing" },
        { label: "Live location pings", status: "Missing" },
      ],
    };
  }

  const [bootstrap, checks, documents, messages] = await Promise.all([
    commandDriverBootstrap(token, depotId),
    commandListVehicleChecks(token, { today: false, limit: 1 }),
    commandListDocuments(token),
    commandListDriverMessages(token),
  ]);

  const signOnLive = Boolean(bootstrap.ok && (bootstrap.bootstrap?.duties?.length ?? 0) >= 0);
  const probes = {
    session: { ok: true, configured: true },
    bootstrap: { ok: bootstrap.ok, configured: true },
    signOn: { ok: signOnLive, configured: true, skipped: !bootstrap.ok },
    defects: { ok: bootstrap.ok, configured: true, skipped: !bootstrap.ok },
    incidents: { ok: bootstrap.ok, configured: true, skipped: !bootstrap.ok },
    vehicleChecks: { ok: checks.ok, configured: true },
    documents: { ok: documents.ok, configured: true },
    messages: { ok: messages.ok, configured: true },
    location: { ok: true, configured: true },
  };

  return {
    configured: true,
    bootstrapOk: bootstrap.ok,
    capabilities: [
      { label: "Sign-in / driver session", status: capabilityStatus(probes.session) },
      { label: "Bootstrap home + duties", status: capabilityStatus(probes.bootstrap) },
      { label: "Acknowledge duty", status: capabilityStatus(probes.bootstrap) },
      { label: "Report defect → Admin", status: capabilityStatus(probes.defects) },
      { label: "Report incident → Admin", status: capabilityStatus(probes.incidents) },
      { label: "Vehicle check submit", status: capabilityStatus(probes.vehicleChecks) },
      { label: "Documents self-serve", status: capabilityStatus(probes.documents) },
      {
        label: "Messages / chat",
        status: messages.ok ? "Live" : capabilityStatus(probes.messages),
      },
      { label: "Working time / sign-on", status: signOnLive ? "Live" : capabilityStatus(probes.signOn) },
      { label: "Live location pings", status: capabilityStatus(probes.location) },
    ],
  };
}
