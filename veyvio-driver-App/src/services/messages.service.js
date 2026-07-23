import {
  markDriverMessageReadViaCommand,
  replyDriverMessageViaCommand,
} from "@/services/command-driver-ops.service";
import { commandGetDriverMessageThread, commandStartDriverMessage } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";

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
    })),
  };
}

export async function contactAdmin(driver, { subject, message, audience = "dispatch" }) {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };

  const trimmedSubject = subject?.trim();
  const trimmedBody = message?.trim();
  if (!trimmedSubject || !trimmedBody) {
    return { ok: false, message: "Subject and message are required." };
  }

  const result = await commandStartDriverMessage(token, {
    subject: trimmedSubject,
    body: trimmedBody,
    audience,
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? "Failed to start conversation." };
  }

  return {
    ok: true,
    threadId: result.conversationId ?? result.threadId,
    audience,
    driverId: driver?.id,
  };
}

export async function replyToThread(_driver, threadId, body) {
  const trimmed = body?.trim();
  if (!trimmed) return { ok: false, message: "Message cannot be empty." };

  const result = await replyDriverMessageViaCommand({
    conversationId: threadId,
    body: trimmed,
  });

  if (!result.ok) return { ok: false, message: result.message ?? "Reply could not be sent." };
  return { ok: true };
}

export async function markThreadRead(conversationId) {
  return markDriverMessageReadViaCommand(conversationId);
}
