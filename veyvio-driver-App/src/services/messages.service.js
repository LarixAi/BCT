import { getSupabaseClient } from "@/lib/supabase/client";
import { commandGetDriverMessageThread, commandStartDriverMessage } from "@/lib/command-api";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import {
  clearMessageDraft,
  clearThreadReplyDraft,
  loadMessageDraft,
  loadThreadReplyDraft,
  saveMessageDraft,
  saveThreadReplyDraft,
} from "@/lib/driver-sensitive-storage";
import {
  markDriverMessageReadViaCommand,
  replyDriverMessageViaCommand,
} from "@/services/command-driver-ops.service";
import { enqueueOpsCommand, listPendingMessageOps } from "@/lib/driver-ops-outbox.storage";
import { flushOpsOutbox } from "@/services/driver-ops-outbox.service";

async function accessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function getDriverMessageThread(threadId) {
  const token = await accessToken();
  if (!token) throw new Error("Not signed in.");

  const result = await commandGetDriverMessageThread(token, threadId);
  if (!result.ok) throw new Error(result.message ?? "Conversation not found.");

  return {
    thread: result.thread,
    messages: (result.messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      fromDriver: Boolean(m.from_driver),
      senderName: m.sender_name ?? (m.from_driver ? "You" : "Transport office"),
      deliveryStatus: m.deliveryStatus ?? (m.from_driver ? "delivered" : m.read_at ? "read" : "delivered"),
      readAt: m.read_at ?? null,
    })),
  };
}

export function listQueuedThreadMessages(driver, session, threadId) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  return listPendingMessageOps(driver?.id, companyId, membershipId, threadId).map((item) => ({
    id: item.id,
    body: String(item.payload?.body ?? ""),
    createdAt: item.createdAt,
    fromDriver: true,
    senderName: "You",
    deliveryStatus: "pending",
    readAt: null,
  }));
}

export async function loadComposeDraft(driver, session) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  return loadMessageDraft(companyId, membershipId);
}

export async function saveComposeDraft(driver, session, draft) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  await saveMessageDraft(companyId, membershipId, draft);
}

export async function clearComposeDraft(driver, session) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  await clearMessageDraft(companyId, membershipId);
}

export async function loadReplyDraft(driver, session, threadId) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  return loadThreadReplyDraft(companyId, membershipId, threadId);
}

export async function saveReplyDraft(driver, session, threadId, body) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  await saveThreadReplyDraft(companyId, membershipId, threadId, body);
}

export async function clearReplyDraft(driver, session, threadId) {
  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  await clearThreadReplyDraft(companyId, membershipId, threadId);
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function contactAdmin(driver, { subject, message, audience = "dispatch", session = null } = {}) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };

  const trimmedSubject = subject?.trim();
  const trimmedBody = message?.trim();
  if (!trimmedSubject || !trimmedBody) {
    return { ok: false, message: "Subject and message are required." };
  }

  const payload = { subject: trimmedSubject, body: trimmedBody, audience };

  if (isOffline()) {
    const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
    enqueueOpsCommand(driver.id, { type: "message_start", payload }, companyId, membershipId);
    await clearComposeDraft(driver, session);
    return {
      ok: true,
      queued: true,
      message: "Message saved on this device — will reach Command when connection returns.",
    };
  }

  const result = await commandStartDriverMessage(token, payload);

  if (!result.ok) {
    return { ok: false, message: result.message ?? "Failed to start conversation." };
  }

  await clearComposeDraft(driver, session);

  return {
    ok: true,
    threadId: result.conversationId ?? result.threadId,
    audience,
    driverId: driver?.id,
  };
}

export async function replyToThread(driver, threadId, body, session = null) {
  const trimmed = body?.trim();
  if (!trimmed) return { ok: false, message: "Message cannot be empty." };

  if (isOffline()) {
    const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
    enqueueOpsCommand(
      driver.id,
      { type: "message_reply", payload: { conversationId: threadId, body: trimmed } },
      companyId,
      membershipId,
    );
    await clearReplyDraft(driver, session, threadId);
    return {
      ok: true,
      queued: true,
      message: "Reply saved on this device — will reach Command when connection returns.",
      pendingMessage: {
        id: `pending-${Date.now()}`,
        body: trimmed,
        createdAt: new Date().toISOString(),
        fromDriver: true,
        senderName: "You",
        deliveryStatus: "pending",
      },
    };
  }

  const result = await replyDriverMessageViaCommand({
    conversationId: threadId,
    body: trimmed,
  });

  if (!result.ok) return { ok: false, message: result.message ?? "Reply could not be sent." };
  await clearReplyDraft(driver, session, threadId);
  return { ok: true };
}

export { flushOpsOutbox as flushMessageOutbox };

export async function markThreadRead(conversationId) {
  return markDriverMessageReadViaCommand(conversationId);
}
