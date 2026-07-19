import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  formatDriverChatTime,
  getDriverBookingChat,
  sendDriverBookingMessage,
} from "@/services/driver-booking-chat.service";

/**
 * In-ride passenger chat for PHV customer bookings.
 * @param {{ customerBookingId: string; customerName?: string; disabled?: boolean }} props
 */
export default function DriverBookingChatPanel({
  customerBookingId,
  customerName = "Passenger",
  disabled = false,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendBusy, setSendBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const loadChat = useCallback(async () => {
    if (!customerBookingId) return;
    const result = await getDriverBookingChat(customerBookingId);
    if (!result.ok) {
      setError(result.message ?? "Could not load messages.");
      return;
    }
    setMessages(result.chat.messages);
    setError("");
  }, [customerBookingId]);

  useEffect(() => {
    if (!customerBookingId) return;
    void loadChat().finally(() => setLoading(false));
  }, [customerBookingId, loadChat]);

  useEffect(() => {
    if (!customerBookingId || loading) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`driver-booking-chat-${customerBookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_booking_messages",
          filter: `booking_id=eq.${customerBookingId}`,
        },
        () => {
          void loadChat();
        },
      )
      .subscribe();

    const timer = window.setInterval(() => void loadChat(), 8000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [customerBookingId, loadChat, loading]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sendBusy || disabled) return;

    setSendBusy(true);
    setError("");
    const result = await sendDriverBookingMessage(customerBookingId, body);
    setSendBusy(false);

    if (!result.ok) {
      setError(result.message ?? "Could not send message.");
      return;
    }

    setDraft("");
    await loadChat();
  }

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4" data-testid="driver-booking-chat">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Message passenger</p>
      <p className="mt-0.5 text-sm text-gray-600">Chat with {customerName} during this trip.</p>

      <div
        ref={scrollRef}
        className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-gray-50 p-3"
        aria-live="polite"
      >
        {loading ? (
          <p className="text-center text-sm text-gray-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const fromDriver = message.senderRole === "driver";
            return (
              <div key={message.id} className={`flex ${fromDriver ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      fromDriver ? "bg-[#1eaeae] text-white" : "bg-white text-gray-900 border border-gray-200"
                    }`}
                  >
                    {message.body}
                  </div>
                  <p className={`mt-0.5 text-[10px] text-gray-500 ${fromDriver ? "text-right" : ""}`}>
                    {formatDriverChatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          rows={1}
          className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1eaeae]"
          placeholder={`Message ${customerName}`}
          value={draft}
          maxLength={500}
          disabled={disabled || sendBusy}
          data-testid="driver-booking-chat-input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1eaeae] text-white disabled:opacity-50"
          aria-label="Send message"
          disabled={disabled || sendBusy || !draft.trim()}
          data-testid="driver-booking-chat-send"
          onClick={() => void handleSend()}
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
