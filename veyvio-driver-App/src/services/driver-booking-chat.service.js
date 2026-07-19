import { getSupabaseClient } from "@/lib/supabase/client";

/** @param {string} customerBookingId */
export async function getDriverBookingChat(customerBookingId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_get_booking_chat", {
    p_booking_id: customerBookingId,
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.ok) return { ok: false, message: data?.message ?? "Could not load chat" };

  return {
    ok: true,
    chat: {
      customerName: data.customer_name ?? "Passenger",
      canSend: data.can_send !== false,
      customerLastReadAt: data.customer_last_read_at ?? null,
      messages: Array.isArray(data.messages)
        ? data.messages.map((row) => ({
            id: row.id,
            body: row.body,
            senderRole: row.sender_role,
            createdAt: row.created_at,
          }))
        : [],
    },
  };
}

/** @param {string} customerBookingId @param {string} body */
export async function sendDriverBookingMessage(customerBookingId, body) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_send_booking_message", {
    p_booking_id: customerBookingId,
    p_body: body,
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.ok) return { ok: false, message: data?.message ?? "Could not send message" };

  return { ok: true, messageId: data.message_id, createdAt: data.created_at };
}

/** @param {string | Date} createdAt */
export function formatDriverChatTime(createdAt) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  if (Date.now() - date.getTime() < 60_000) return "Now";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
