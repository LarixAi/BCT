import { getSupabaseClient } from "@/lib/supabase/client";
import {
  commandListNotifications,
  commandMarkAllNotificationsRead,
  commandMarkNotificationRead,
  commandNotificationUnreadCount,
} from "@/lib/command-api";
import { notifyDriverNotificationsChanged } from "@/lib/notifications/unread-events";

async function accessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function normalizeRow(row) {
  return {
    id: String(row.id),
    title: String(row.title ?? "Notification"),
    message: String(row.message ?? row.body ?? ""),
    body: String(row.body ?? row.message ?? ""),
    severity: String(row.severity ?? "info"),
    status: String(row.status ?? (row.read_at || row.readAt ? "read" : "unread")),
    created_at: String(row.created_at ?? row.createdAt ?? ""),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    read_at: row.read_at ?? row.readAt ?? null,
    readAt: row.readAt ?? row.read_at ?? null,
    notification_type: String(row.notification_type ?? row.notificationType ?? "system"),
    notificationType: String(row.notificationType ?? row.notification_type ?? "system"),
    action_url: row.action_url ?? row.actionUrl ?? null,
    actionUrl: row.actionUrl ?? row.action_url ?? null,
    entity_type: row.source_entity_type ?? row.entity_type ?? row.entityType ?? null,
    entity_id: row.source_entity_id ?? row.entity_id ?? row.entityId ?? null,
  };
}

/** Map Command / admin action URLs + notification type onto Driver app routes. */
export function resolveDriverNotificationPath(actionUrl, notification = null) {
  const type = String(
    notification?.notificationType ?? notification?.notification_type ?? "",
  ).toLowerCase();
  const title = String(notification?.title ?? "").toLowerCase();
  const body = String(notification?.body ?? notification?.message ?? "").toLowerCase();
  const haystack = `${type} ${title} ${body} ${actionUrl ?? ""}`.toLowerCase();

  const fromType = () => {
    if (haystack.includes("training")) return "/training";
    if (
      haystack.includes("document") ||
      haystack.includes("evidence") ||
      haystack.includes("licence") ||
      haystack.includes("license") ||
      haystack.includes("dbs") ||
      haystack.includes("medical") ||
      haystack.includes("upload")
    ) {
      return "/documents";
    }
    if (haystack.includes("onboarding") || haystack.includes("activation")) return "/onboarding";
    if (haystack.includes("readiness") || haystack.includes("eligib")) return "/readiness";
    if (haystack.includes("duty") || haystack.includes("job") || haystack.includes("trip")) return "/jobs";
    if (haystack.includes("walkaround") || haystack.includes("vehicle check")) return "/check";
    if (haystack.includes("message") || haystack.includes("inbox")) return "/messages";
    return "/readiness";
  };

  if (!actionUrl) return fromType();

  const raw = String(actionUrl).trim();
  if (!raw) return fromType();

  // Admin Command deep links — remap for the driver app.
  if (raw.startsWith("/drivers/") || raw.includes("/drivers/")) {
    if (raw.toLowerCase().includes("training")) return "/training";
    return fromType();
  }

  // Already a driver-app path
  if (raw.startsWith("/")) {
    if (raw.startsWith("/onboarding")) return "/onboarding";
    if (raw.startsWith("/training")) return "/training";
    if (raw.startsWith("/documents")) return "/documents";
    if (raw.startsWith("/duty")) return "/duty";
    if (raw.startsWith("/jobs") || raw.startsWith("/offers")) return raw.split("?")[0];
    if (raw.startsWith("/readiness")) return "/readiness";
    if (raw.startsWith("/messages") || raw.startsWith("/threads")) return raw.split("?")[0];
    if (raw.startsWith("/check")) return "/check";
    if (raw.startsWith("/notifications")) return fromType();
    return raw.split("?")[0] || fromType();
  }

  return fromType();
}

export function notificationCategoryLabel(type) {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("training")) return "Training";
  if (t.includes("onboarding") || t.includes("document") || t.includes("evidence")) return "Compliance";
  if (t.includes("invite") || t.includes("account")) return "Account";
  if (t.includes("duty") || t.includes("job")) return "Duty";
  return "Ops";
}

export async function getDriverNotifications(userId) {
  const token = await accessToken();
  if (token) {
    const result = await commandListNotifications(token);
    if (result.ok) return (result.notifications ?? []).map(normalizeRow);
  }

  if (!userId) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, title, body, severity, status, created_at, read_at, notification_type, action_url, source_entity_type, source_entity_id",
    )
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Older Ridova schema used `message` only — retry minimal columns.
    const retry = await supabase
      .from("notifications")
      .select("id, title, message, severity, status, created_at, read_at, notification_type, action_url, source_entity_type, source_entity_id")
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (retry.error) throw new Error(retry.error.message);
    return (retry.data ?? []).map(normalizeRow);
  }
  return (data ?? []).map(normalizeRow);
}

export async function countUnread(userId) {
  const token = await accessToken();
  if (token) {
    const result = await commandNotificationUnreadCount(token);
    if (result.ok) return result.count ?? 0;
  }

  if (!userId) return 0;
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("status", "unread");

  if (error) {
    const fallback = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null);
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.count ?? 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(notificationId) {
  const token = await accessToken();
  if (token) {
    const result = await commandMarkNotificationRead(token, notificationId);
    if (result.ok) {
      notifyDriverNotificationsChanged();
      return;
    }
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), status: "read" })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
  notifyDriverNotificationsChanged();
}

export async function markAllNotificationsRead(userId, notificationIds = []) {
  const token = await accessToken();
  let lastError = null;

  if (token) {
    const result = await commandMarkAllNotificationsRead(token);
    if (result.ok) {
      notifyDriverNotificationsChanged();
      return { ok: true, updated: result.updated ?? null };
    }
    lastError = result.message;

    // Fallback: mark each unread id individually (works even if bulk update is blocked).
    const ids = (notificationIds ?? []).filter(Boolean);
    if (ids.length) {
      let updated = 0;
      for (const id of ids) {
        const one = await commandMarkNotificationRead(token, id);
        if (one.ok) updated += 1;
      }
      if (updated > 0) {
        notifyDriverNotificationsChanged();
        return { ok: true, updated };
      }
    }
  }

  if (!userId) {
    throw new Error(lastError || "Could not mark notifications as read.");
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: now, status: "read" })
    .eq("recipient_user_id", userId)
    .or("read_at.is.null,status.eq.unread");

  if (error) {
    const fallback = await supabase
      .from("notifications")
      .update({ read_at: now, status: "read" })
      .eq("recipient_user_id", userId)
      .is("read_at", null);
    if (fallback.error) throw new Error(fallback.error.message || lastError || "Mark all read failed.");
  }

  notifyDriverNotificationsChanged();
  return { ok: true };
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
