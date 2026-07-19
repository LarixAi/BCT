import { getSupabaseClient } from "@/lib/supabase/client";
import { notifyDriverNotificationsChanged } from "@/lib/notifications/unread-events";

export async function getDriverNotifications(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, severity, status, created_at, read_at, notification_type, action_url, entity_type, entity_id")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countUnread(userId) {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("status", "unread");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(notificationId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), status: "read" })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
  notifyDriverNotificationsChanged();
}

export async function markAllNotificationsRead(userId) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now, status: "read" })
    .eq("recipient_user_id", userId)
    .eq("status", "unread");
  if (error) throw new Error(error.message);
  notifyDriverNotificationsChanged();
}

/** Notify dispatch/control room about a driver-initiated operational event. */
export async function notifyDispatcher({
  organisationId,
  depotId = null,
  notificationType,
  entityType,
  entityId,
  title,
  message,
  severity = "info",
  actionUrl = null,
}) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("notifications").insert({
    organisation_id: organisationId,
    depot_id: depotId,
    recipient_role: "dispatcher",
    notification_type: notificationType,
    entity_type: entityType,
    entity_id: entityId,
    title,
    message,
    severity,
    status: "unread",
    action_url: actionUrl,
    created_by: user?.id ?? null,
  });

  if (error) console.warn("Dispatcher notification failed:", error.message);
}
