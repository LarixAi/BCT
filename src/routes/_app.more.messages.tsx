import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { useSessionStore } from "@/platform/auth/session-store";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubCallout, HubEmptyPanel, hubListPanelClass } from "@/features/hub/HubContentPrimitives";
import { HubPrimaryButton } from "@/features/hub/HubPageHeader";

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
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<YardMessage | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      setNotice("");
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
    setNotice("");
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
      setNotice("Reply sent to the driver.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <MoreSubpageLayout title="Driver messages" eyebrow="Ops">
      <DashboardSurface>
        <p className="text-sm text-[#667085]">
          Drivers can message Yard from the Driver app. Replies here write back to the same Command thread.
        </p>
      </DashboardSurface>

      {loading ? (
        <DashboardSurface>
          <p className="text-sm text-[#667085]">Loading…</p>
        </DashboardSurface>
      ) : null}

      {error ? <HubCallout tone="warn">{error}</HubCallout> : null}
      {notice ? <HubCallout tone="success">{notice}</HubCallout> : null}

      {!loading && messages.length === 0 && !error ? (
        <DashboardSurface>
          <HubEmptyPanel
            icon={MessageSquare}
            title="No driver messages yet"
            description="When a driver chooses Yard in Contact ops, the thread appears here and in Admin Yard."
          />
        </DashboardSurface>
      ) : null}

      {messages.length > 0 ? (
        <>
          <DashboardSurface>
            <div className={hubListPanelClass}>
              {messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#fcfcfd] ${
                    selected?.id === m.id ? "bg-[#fcfcfd]" : ""
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{m.driverName || "Driver"}</p>
                  <p className="text-sm text-ink">{m.subject}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[#667085]">{m.body}</p>
                </button>
              ))}
            </div>
          </DashboardSurface>

          {selected ? (
            <DashboardSurface className="space-y-3">
              <p className="text-sm font-semibold text-ink">{selected.subject}</p>
              <p className="whitespace-pre-wrap text-sm text-[#667085]">{selected.body}</p>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#eaecf0] px-3 py-2 text-sm"
                placeholder="Reply as Yard…"
              />
              <HubPrimaryButton
                disabled={sending || !reply.trim()}
                onClick={() => void sendReply()}
                className="w-full"
              >
                {sending ? "Sending…" : "Send Yard reply"}
              </HubPrimaryButton>
            </DashboardSurface>
          ) : null}
        </>
      ) : null}
    </MoreSubpageLayout>
  );
}
