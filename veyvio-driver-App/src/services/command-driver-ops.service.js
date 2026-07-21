import { getSupabaseClient } from "@/lib/supabase/client";
import {
  commandAcknowledgeDuty,
  commandListDocuments,
  commandListDriverMessages,
  commandListVehicleChecks,
  commandMarkDriverMessageRead,
  commandReplyDriverMessage,
  commandReportDefect,
  commandReportIncident,
  commandSignOffDuty,
  commandSignOnDuty,
  commandSubmitDocument,
  commandSubmitVehicleCheck,
} from "@/lib/command-api";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";

async function accessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function acknowledgeDuty(dutyId) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandAcknowledgeDuty(token, dutyId);
}

export async function signOnDuty(dutyId) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandSignOnDuty(token, dutyId);
}

/**
 * After a successful walkaround, acknowledge (if needed) and sign the driver on
 * for the matching published Command duty so Home / My duty stay in sync.
 */
export async function signOnDutyAfterVehicleCheck({ dutyId = null, depotId = null } = {}) {
  const boot = await loadDriverBootstrap({ depotId });
  if (!boot.ok) return { ok: false, message: boot.message ?? "Could not load duty." };

  const duties = boot.bootstrap?.duties ?? [];
  const duty =
    (dutyId ? duties.find((row) => String(row.id) === String(dutyId)) : null) ?? duties[0] ?? null;

  if (!duty?.id) {
    return { ok: true, skipped: true, message: "No published duty to sign on." };
  }

  if (duty.actualSignOnAt || duty.lifecycleStatus === "in_progress") {
    return {
      ok: true,
      alreadySignedOn: true,
      dutyId: duty.id,
      signedOnAt: duty.actualSignOnAt ?? null,
    };
  }

  if (duty.actualSignOffAt || duty.lifecycleStatus === "completed") {
    return { ok: true, skipped: true, message: "Duty already signed off." };
  }

  if (needsAck(duty.lifecycleStatus)) {
    const ack = await acknowledgeDuty(duty.id);
    if (!ack.ok) {
      return { ok: false, message: ack.message ?? "Could not acknowledge duty before sign-on." };
    }
  }

  const signed = await signOnDuty(duty.id);
  if (!signed.ok) {
    return { ok: false, message: signed.message ?? "Walkaround saved, but duty sign-on failed." };
  }

  return {
    ok: true,
    dutyId: duty.id,
    signedOnAt: signed.signedOnAt ?? signed.duty?.actualSignOnAt ?? new Date().toISOString(),
    autoSignedOn: true,
  };
}

export async function signOffDuty(dutyId) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandSignOffDuty(token, dutyId);
}

export async function listDriverMessagesViaCommand() {
  const token = await accessToken();
  if (!token) return { ok: false, inbox: { unreadTotal: 0, conversations: [] } };
  return commandListDriverMessages(token);
}

export async function replyDriverMessageViaCommand(input) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandReplyDriverMessage(token, input);
}

export async function markDriverMessageReadViaCommand(conversationId) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandMarkDriverMessageRead(token, conversationId);
}

export async function reportDefectViaCommand(input) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandReportDefect(token, input);
}

export async function reportIncidentViaCommand(input) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandReportIncident(token, input);
}

export async function refreshCommandBootstrap(depotId, { force = false } = {}) {
  return loadDriverBootstrap({ depotId, force });
}

export function needsAck(lifecycleStatus) {
  const s = String(lifecycleStatus ?? "");
  return s === "published" || s === "delivered" || s === "viewed";
}

export async function submitVehicleCheckViaCommand(input) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandSubmitVehicleCheck(token, input);
}

export async function listTodayVehicleChecksViaCommand() {
  const token = await accessToken();
  if (!token) return { ok: false, checks: [] };
  return commandListVehicleChecks(token, { today: true, limit: 40 });
}

export async function listVehicleCheckHistoryViaCommand({ limit = 40 } = {}) {
  const token = await accessToken();
  if (!token) return { ok: false, checks: [] };
  return commandListVehicleChecks(token, { today: false, limit });
}

export async function listDocumentsViaCommand() {
  const token = await accessToken();
  if (!token) return { ok: false, documents: [] };
  return commandListDocuments(token);
}

export async function submitDocumentViaCommand(input, file) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  return commandSubmitDocument(token, input, file);
}
