import { format } from "date-fns";

export const MESSAGE_TYPE_LABELS = {
  document_issue: "Document issue",
  compliance_update: "Compliance",
  suspension_notice: "Suspension",
  approval: "Approved",
  general: "Message",
  other: "Notice",
};

export const MESSAGE_TYPE_STYLES = {
  document_issue: "bg-amber-100 text-amber-800",
  compliance_update: "bg-blue-100 text-blue-800",
  suspension_notice: "bg-red-100 text-red-800",
  approval: "bg-green-100 text-green-800",
  general: "bg-gray-100 text-gray-700",
  other: "bg-gray-100 text-gray-700",
};

export function countUnreadAdminMessages(messages) {
  return (messages || []).filter(m => m.sender_role === "admin" && !m.read_by_driver).length;
}

export function sortMessagesChronological(messages) {
  return [...(messages || [])].sort(
    (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
  );
}

export function sortMessagesNewestFirst(messages) {
  return [...(messages || [])].sort(
    (a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)
  );
}

export function adminNotifications(messages) {
  return sortMessagesNewestFirst((messages || []).filter(m => m.sender_role === "admin"));
}

export function messagePreview(msg) {
  if (msg?.subject?.trim()) return msg.subject.trim();
  const body = msg?.body?.trim() || "";
  return body.length > 72 ? `${body.slice(0, 72)}…` : body || "Message";
}

export function messageSnippet(msg) {
  const body = msg?.body?.trim() || "";
  return body.length > 120 ? `${body.slice(0, 120)}…` : body;
}

export function formatMessageTime(iso) {
  if (!iso) return "";
  try {
    return format(new Date(iso), "d MMM · HH:mm");
  } catch {
    return "";
  }
}

export function formatMessageDate(iso) {
  if (!iso) return "";
  try {
    return format(new Date(iso), "d MMM");
  } catch {
    return "";
  }
}

/** Mark admin messages read in DB and return updated local list. */
export async function markAdminMessagesRead(messages, updateFn) {
  const unread = (messages || []).filter(m => m.sender_role === "admin" && !m.read_by_driver);
  if (!unread.length) return messages;

  const readAt = new Date().toISOString();
  await Promise.all(
    unread.map(m =>
      updateFn(m.id, { read_by_driver: true, read_at: readAt }).catch(() => null)
    )
  );

  const readIds = new Set(unread.map(m => m.id));
  return messages.map(m =>
    readIds.has(m.id) ? { ...m, read_by_driver: true, read_at: readAt } : m
  );
}
