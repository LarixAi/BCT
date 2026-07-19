import { getSupabaseClient } from "@/lib/supabase/client";
import { logDriverAudit } from "@/services/audit.service";
import { notifyDispatcher } from "@/services/notifications.service";

async function getAuthenticatedUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const PENDING_DEBRIEF_STATUSES = ["issued", "overdue", "pending_acknowledgement"];
const PENDING_CORRECTIVE_STATUSES = ["open", "in_progress", "overdue"];

export async function listPendingDebriefNotices(driverId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("debrief_notices")
    .select("id, notice_title, notice_body, notice_status, issued_at, meeting_due_at, infringement_id")
    .eq("driver_id", driverId)
    .in("notice_status", PENDING_DEBRIEF_STATUSES)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPendingCorrectiveActions(driverId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("corrective_actions")
    .select("id, title, description, status, due_at, priority, infringement_id, action_type")
    .eq("driver_id", driverId)
    .in("status", PENDING_CORRECTIVE_STATUSES)
    .order("due_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function acknowledgeDebriefNotice(driver, debriefNoticeId, { comments } = {}) {
  const supabase = getSupabaseClient();
  const userId = await getAuthenticatedUserId(supabase);
  const now = new Date().toISOString();

  const { data: notice, error: fetchError } = await supabase
    .from("debrief_notices")
    .select("id, infringement_id, notice_status, notice_title")
    .eq("id", debriefNoticeId)
    .eq("driver_id", driver.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!notice) return { ok: false, message: "Debrief notice not found." };
  if (!PENDING_DEBRIEF_STATUSES.includes(notice.notice_status)) {
    return { ok: false, message: "This debrief has already been acknowledged." };
  }

  const { error: updateError } = await supabase
    .from("debrief_notices")
    .update({
      notice_status: "acknowledged",
      acknowledged_at: now,
      acknowledged_by: userId,
      driver_comments: comments?.trim() || null,
    })
    .eq("id", debriefNoticeId);

  if (updateError) return { ok: false, message: updateError.message };

  await supabase.from("driver_acknowledgements").insert({
    organisation_id: driver.organisationId,
    driver_id: driver.id,
    infringement_id: notice.infringement_id,
    debrief_notice_id: debriefNoticeId,
    acknowledgement_type: "debrief",
    acknowledged_at: now,
    acknowledgement_text: comments?.trim() || "Debrief acknowledged via driver app",
    created_by: userId,
  });

  if (notice.infringement_id) {
    await supabase.from("driver_infringements").update({ status: "acknowledged" }).eq("id", notice.infringement_id);
  }

  await logDriverAudit({
    organisation_id: driver.organisationId,
    entity_table: "debrief_notices",
    entity_id: debriefNoticeId,
    action: "driver_debrief_acknowledged",
    reason: notice.notice_title,
    metadata: { source: "driver_mobile" },
  });

  await notifyDispatcher({
    organisationId: driver.organisationId,
    depotId: driver.homeDepotId ?? null,
    notificationType: "debrief_acknowledged",
    entityType: "debrief_notices",
    entityId: debriefNoticeId,
    title: "Debrief acknowledged",
    message: `${driver.fullName} acknowledged debrief: ${notice.notice_title}`,
    severity: "info",
  });

  return { ok: true };
}

export async function acknowledgeCorrectiveAction(driver, correctiveActionId, { comments } = {}) {
  const supabase = getSupabaseClient();
  const userId = await getAuthenticatedUserId(supabase);
  const now = new Date().toISOString();

  const { data: action, error: fetchError } = await supabase
    .from("corrective_actions")
    .select("id, title, status, infringement_id")
    .eq("id", correctiveActionId)
    .eq("driver_id", driver.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!action) return { ok: false, message: "Corrective action not found." };
  if (!PENDING_CORRECTIVE_STATUSES.includes(action.status)) {
    return { ok: false, message: "This action is no longer pending acknowledgement." };
  }

  const { error: ackError } = await supabase.from("driver_acknowledgements").insert({
    organisation_id: driver.organisationId,
    driver_id: driver.id,
    infringement_id: action.infringement_id,
    acknowledgement_type: "corrective_action",
    acknowledged_at: now,
    acknowledgement_text: comments?.trim() || `Acknowledged corrective action: ${action.title}`,
    created_by: userId,
  });

  if (ackError) return { ok: false, message: ackError.message };

  await logDriverAudit({
    organisation_id: driver.organisationId,
    entity_table: "corrective_actions",
    entity_id: correctiveActionId,
    action: "driver_corrective_action_acknowledged",
    reason: action.title,
    metadata: { source: "driver_mobile" },
  });

  await notifyDispatcher({
    organisationId: driver.organisationId,
    depotId: driver.homeDepotId ?? null,
    notificationType: "debrief_acknowledged",
    entityType: "drivers",
    entityId: driver.id,
    title: "Corrective action acknowledged",
    message: `${driver.fullName} acknowledged: ${action.title}`,
    severity: "info",
  });

  return { ok: true };
}
