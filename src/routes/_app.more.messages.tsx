import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_app/more/messages")({
  head: () => ({ meta: [{ title: yardPageTitle("Driver messages") }] }),
  component: YardDriverMessagesPage,
});

type YardMessage = {
  id: string;
  conversationId: string;
  driverId: string | null;
  driverName: string | null;
  subject: string;
  body: string;
  sentAt: string;
  sourceApp: string;
};

function commandApiBase() {
  const configured = import.meta.env.VITE_COMMAND_API_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const supabase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (supabase) return `${supabase}/functions/v1/command-api`;
  return null;
}

function YardDriverMessagesPage() {
  const accessToken = useSessionStore((s) => s.accessToken);
  const [messages, setMessages] = useState<YardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<YardMessage | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      const base = commandApiBase();
      if (!base || !accessToken || accessToken.startsWith("mock_")) {
        setMessages([]);
        setLoading(false);
        setError(
          "Sign into Command on this device to load live Driver→Yard messages. Until then, yard replies are handled in Admin → Yard → Driver messages.",
        );
        return;
      }
      try {
        const res = await fetch(`${base}/yard/messages`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error("Yard messages could not be loaded.");
        const rows = (await res.json()) as YardMessage[];
        setMessages(rows);
        setSelected(rows[0] ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Yard messages could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  async function sendReply() {
    if (!selected?.driverId || !reply.trim()) return;
    const base = commandApiBase();
    if (!base || !accessToken || accessToken.startsWith("mock_")) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${base}/yard/messages`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          conversationId: selected.conversationId,
          driverId: selected.driverId,
          body: reply.trim(),
        }),
      });
      if (!res.ok) throw new Error("Reply could not be sent.");
      setReply("");
      setError("Reply sent to the driver.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <MoreSubpageLayout title="Driver messages" eyebrow="Ops">
      <p className="text-sm text-muted">
        Drivers can message Yard from the Driver app. Replies here write back to the same Command thread.
      </p>

      {loading ? <p className="text-sm text-muted">Loading…</p> : null}
      {error ? (
        <div className="rounded-xs border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">{error}</div>
      ) : null}

      {!loading && messages.length === 0 && !error ? (
        <div className="rounded-xs border border-border bg-white px-4 py-8 text-center">
          <MessageSquare className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">No driver messages yet</p>
          <p className="mt-1 text-sm text-muted">
            When a driver chooses Yard in Contact ops, the thread appears here and in Admin Yard.
          </p>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xs border border-border bg-white divide-y divide-border">
            {messages.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m)}
                className="w-full px-3 py-3 text-left hover:bg-secondary/40"
              >
                <p className="text-sm font-bold">{m.driverName || "Driver"}</p>
                <p className="text-sm">{m.subject}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{m.body}</p>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="space-y-2 rounded-xs border border-border bg-white p-3">
              <p className="text-sm font-bold">{selected.subject}</p>
              <p className="whitespace-pre-wrap text-sm text-muted">{selected.body}</p>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="w-full rounded-xs border border-border px-3 py-2 text-sm"
                placeholder="Reply as Yard…"
              />
              <button
                type="button"
                disabled={sending || !reply.trim()}
                onClick={() => void sendReply()}
                className="w-full rounded-xs bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send Yard reply"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </MoreSubpageLayout>
  );
}
