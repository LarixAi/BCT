import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime } from "@/lib/uk-locale";
import { DRIVER_NAV_TOTAL_OFFSET } from "@/lib/driverSafeArea";
import {
  clearReplyDraft,
  getDriverMessageThread,
  listQueuedThreadMessages,
  loadReplyDraft,
  replyToThread,
  saveReplyDraft,
} from "@/services/messages.service";

function deliveryLabel(msg) {
  if (msg.deliveryStatus === "pending") return "Waiting for connection";
  if (msg.fromDriver) return "Delivered to Command";
  if (msg.deliveryStatus === "read" || msg.readAt) return "Read";
  return null;
}

function audienceLabel(audience) {
  if (audience === "yard") return "Yard";
  if (audience === "both") return "Dispatch · Yard";
  return "Dispatch";
}

export default function DriverMessageThread({ driver }) {
  const { threadId } = useParams();
  const { session } = useDriverSupabaseAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [queuedNotice, setQueuedNotice] = useState("");
  const [pendingMessages, setPendingMessages] = useState([]);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    if (!threadId) return;
    setError("");
    try {
      const data = await getDriverMessageThread(threadId);
      if (!data) setError("Conversation not found.");
      else {
        setDetail(data);
        setPendingMessages(await listQueuedThreadMessages(driver, session, threadId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [threadId, driver, session]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!threadId) return undefined;
    const interval = window.setInterval(() => {
      void load();
    }, 8000);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [threadId, load]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [detail?.messages?.length, pendingMessages.length]);

  useEffect(() => {
    if (!threadId) return;
    void loadReplyDraft(driver, session, threadId).then((draft) => {
      if (draft) setReply(draft);
    });
  }, [threadId, driver, session]);

  useEffect(() => {
    if (!threadId) return undefined;
    const timer = window.setTimeout(() => {
      void saveReplyDraft(driver, session, threadId, reply);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [reply, threadId, driver, session]);

  const sendReply = async () => {
    setSending(true);
    setQueuedNotice("");
    const result = await replyToThread(driver, threadId, reply, session);
    setSending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.queued) {
      setError("");
      setQueuedNotice(result.message);
      if (result.pendingMessage) {
        setPendingMessages((prev) => [...prev, result.pendingMessage]);
      }
      setReply("");
      await clearReplyDraft(driver, session, threadId);
      return;
    }
    setReply("");
    await clearReplyDraft(driver, session, threadId);
    await load();
  };

  const visibleMessages = [...(detail?.messages ?? []), ...pendingMessages];

  const audience = detail?.thread?.audience;

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: `calc(100dvh - ${DRIVER_NAV_TOTAL_OFFSET})` }}
    >
      <DriverOperationalHeader
        title={detail?.thread?.subject ?? "Conversation"}
        subtitle={audience ? audienceLabel(audience) : "Ops message"}
        backTo="/messages"
      />

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? <DriverPageLoader label="Loading messages…" /> : null}
        {error && !detail ? <p className="py-4 text-sm text-red-600">{error}</p> : null}

        <div className="space-y-3 pb-2">
          {visibleMessages.map((msg) => {
            const statusLabel = deliveryLabel(msg);
            return (
            <div
              key={msg.id}
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.fromDriver
                  ? msg.deliveryStatus === "pending"
                    ? "ml-auto border border-amber-200 bg-amber-50 text-amber-950"
                    : "ml-auto bg-[#1eaeae] text-white"
                  : "mr-auto border border-border bg-card text-foreground"
              }`}
            >
              {!msg.fromDriver ? (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {msg.senderName ?? "Transport office"}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
              <p className={`mt-2 text-[10px] ${msg.fromDriver && msg.deliveryStatus !== "pending" ? "text-white/75" : "text-muted-foreground"}`}>
                {formatUkDateTime(msg.createdAt)}
                {statusLabel ? ` · ${statusLabel}` : ""}
              </p>
            </div>
          )})}
        </div>
      </div>

      {detail ? (
        <div className="border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          {queuedNotice ? (
            <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {queuedNotice}
            </p>
          ) : null}
          {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Type a reply…"
            className={`w-full resize-none rounded-xl px-4 py-3 text-sm ${op.input}`}
          />
          <Button
            onClick={() => void sendReply()}
            disabled={sending || !reply.trim()}
            className={`mt-2 h-11 w-full ${op.primaryBtn}`}
          >
            {sending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
