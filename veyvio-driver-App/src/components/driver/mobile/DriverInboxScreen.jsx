/**
 * DriverInboxScreen — inbox tab with notifications + operator support chat.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Send, Archive, AlertCircle, RefreshCw } from "lucide-react";
import { withTimeout } from "@/lib/withTimeout";
import {
  adminNotifications,
  countUnreadAdminMessages,
  formatMessageDate,
  formatMessageTime,
  markAdminMessagesRead,
  messagePreview,
  messageSnippet,
  MESSAGE_TYPE_LABELS,
  MESSAGE_TYPE_STYLES,
  sortMessagesChronological,
} from "@/lib/driverInbox";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";

const FETCH_TIMEOUT_MS = 8000;

export default function DriverInboxScreen({ driver, onUnreadChange }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  const threadEndRef = useRef(null);

  const syncUnread = useCallback(
    (msgs) => {
      onUnreadChange?.(countUnreadAdminMessages(msgs));
    },
    [onUnreadChange]
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await withTimeout(
        base44.entities.DriverMessage.filter({ driver_id: driver.id }, "-created_date", 100),
        FETCH_TIMEOUT_MS
      );
      const sorted = sortMessagesChronological(msgs);
      const marked = await markAdminMessagesRead(
        sorted,
        (id, patch) => base44.entities.DriverMessage.update(id, patch)
      );
      setMessages(marked);
      syncUnread(marked);
    } catch (err) {
      setError(err?.message || "Could not load messages");
    } finally {
      setLoading(false);
    }
  }, [driver.id, syncUnread]);

  useEffect(() => {
    loadMessages();
    const unsub = base44.entities.DriverMessage.subscribe(ev => {
      if (ev.data?.driver_id !== driver.id) return;

      if (ev.type === "create") {
        const readAt = new Date().toISOString();
        const incoming =
          ev.data.sender_role === "admin"
            ? { ...ev.data, read_by_driver: true, read_at: readAt }
            : ev.data;

        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          const next = sortMessagesChronological([...prev, incoming]);
          syncUnread(next);
          return next;
        });

        if (ev.data.sender_role === "admin") {
          base44.entities.DriverMessage.update(ev.data.id, {
            read_by_driver: true,
            read_at: readAt,
          }).catch(() => null);
        }
      }

      if (ev.type === "update") {
        setMessages(prev => {
          const next = prev.map(m => (m.id === ev.data.id ? { ...m, ...ev.data } : m));
          syncUnread(next);
          return next;
        });
      }
    });
    return unsub;
  }, [driver.id, loadMessages, syncUnread]);

  useEffect(() => {
    if (activeTab === "support") {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const sendReply = async () => {
    if (!replyBody.trim() || sending) return;
    setSending(true);
    try {
      const msg = await base44.entities.DriverMessage.create({
        driver_id: driver.id,
        driver_name: driver.full_name,
        sender_role: "driver",
        sender_name: driver.full_name,
        body: replyBody.trim(),
        message_type: "general",
      });
      setMessages(prev => sortMessagesChronological([...prev, msg]));
      setReplyBody("");
      setActiveTab("support");
    } catch (err) {
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const notifications = adminNotifications(messages);
  const thread = sortMessagesChronological(messages);
  const unreadCount = countUnreadAdminMessages(messages);

  return (
    <div className="flex flex-col bg-white h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 px-4 pb-3" style={{ paddingTop: DRIVER_SCREEN_TOP }}>
        <h1 className="text-3xl font-bold text-black">Inbox</h1>
        <div className="flex gap-6 mt-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`pb-2 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "notifications" ? "border-black text-black" : "border-transparent text-gray-400"
            }`}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "support" ? "border-black text-black" : "border-transparent text-gray-400"
            }`}
          >
            Support
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-amber-800 flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </p>
          <button type="button" onClick={loadMessages} className="text-xs font-semibold text-amber-900 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Notifications */}
      {activeTab === "notifications" && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-gray-400 px-6">
              <Archive className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium text-gray-600">No notifications yet</p>
              <p className="text-xs mt-1">Your operator will send compliance and account updates here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map(msg => {
                const type = msg.message_type || "general";
                return (
                  <motion.button
                    key={msg.id}
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setActiveTab("support")}
                    className="w-full flex items-start gap-3 px-4 py-4 text-left active:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            MESSAGE_TYPE_STYLES[type] || MESSAGE_TYPE_STYLES.general
                          }`}
                        >
                          {MESSAGE_TYPE_LABELS[type] || "Message"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-black">{messagePreview(msg)}</p>
                      {msg.subject && msg.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{messageSnippet(msg)}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatMessageTime(msg.created_date)}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatMessageDate(msg.created_date)}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Support chat */}
      {activeTab === "support" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
              </div>
            ) : thread.length === 0 ? (
              <div className="text-center py-12 text-gray-400 px-4">
                <p className="text-sm">No conversation yet</p>
                <p className="text-xs mt-1">Send a message to your operator below.</p>
              </div>
            ) : (
              thread.map(msg => {
                const isAdmin = msg.sender_role === "admin";
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        isAdmin ? "bg-gray-100 text-black rounded-tl-sm" : "bg-black text-white rounded-tr-sm"
                      }`}
                    >
                      {msg.subject && isAdmin && (
                        <p className="text-xs font-bold mb-1 opacity-80">{msg.subject}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.body || ""}</p>
                      <p className={`text-[10px] mt-1.5 ${isAdmin ? "text-gray-400" : "text-gray-300"}`}>
                        {isAdmin ? "Operator" : "You"} · {formatMessageTime(msg.created_date)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          <div className="shrink-0 p-4 border-t border-gray-100 bg-white flex gap-2">
            <input
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              placeholder="Message operator…"
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              type="button"
              onClick={sendReply}
              disabled={!replyBody.trim() || sending}
              className="w-11 h-11 bg-black rounded-full flex items-center justify-center disabled:opacity-30 shrink-0"
              aria-label="Send message"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
