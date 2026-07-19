import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, MessageSquarePlus, Send } from "lucide-react";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime } from "@/lib/uk-locale";
import {
  listDriverMessagesViaCommand,
  markDriverMessageReadViaCommand,
} from "@/services/command-driver-ops.service";

function audienceLabel(audience) {
  if (audience === "yard") return "Yard";
  if (audience === "both") return "Dispatch · Yard";
  return "Dispatch";
}

export default function DriverSupabaseMessages() {
  const navigate = useNavigate();
  const { session, bootstrap } = useDriverSupabaseAuth();
  const seedInbox = bootstrap?.messages;
  const [conversations, setConversations] = useState(() => seedInbox?.conversations ?? []);
  const [unreadTotal, setUnreadTotal] = useState(() =>
    typeof seedInbox?.unreadTotal === "number" ? seedInbox.unreadTotal : 0,
  );
  const [loading, setLoading] = useState(() => !(seedInbox?.conversations || typeof seedInbox?.unreadTotal === "number"));

  useEffect(() => {
    let cancelled = false;
    const hadSeed = conversations.length > 0 || unreadTotal > 0;
    void (async () => {
      if (!hadSeed) setLoading(true);
      const result = await listDriverMessagesViaCommand();
      if (cancelled) return;
      if (result.ok) {
        setConversations(result.inbox?.conversations ?? []);
        setUnreadTotal(result.inbox?.unreadTotal ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.activeDepotId]);

  async function openConversation(conversation) {
    if (conversation.unreadCount > 0) {
      await markDriverMessageReadViaCommand(conversation.id);
    }
    navigate(`/threads/${conversation.id}`);
  }

  return (
    <DriverPageContainer>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={op.appLabel}>Messages</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadTotal > 0
              ? `${unreadTotal} unread from Command`
              : "Dispatch and yard notices in one place"}
          </p>
        </div>
        <Link
          to="/contact"
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ${op.primaryBtn}`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New
        </Link>
      </div>

      <Link
        to="/contact"
        className="mt-4 flex min-h-[56px] items-center gap-3 rounded-2xl border border-[#1eaeae]/30 bg-[#1eaeae]/10 px-4 py-3 active:bg-[#1eaeae]/15"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/80">
          <Send className={`h-5 w-5 ${op.iconTeal}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Contact dispatch or yard</p>
          <p className="text-xs text-muted-foreground">Start a new ops message</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Conversations
        </h2>
        {conversations.length > 0 ? (
          <span className="text-xs text-muted-foreground">{conversations.length}</span>
        ) : null}
      </div>

      {loading ? <DriverPageLoader label="Loading messages…" /> : null}

      {!loading && conversations.length === 0 ? (
        <div className="mt-3">
          <DriverEmptyState
            icon={Bell}
            title="No messages yet"
            description="When dispatch or yard send a notice, it shows here. You can also start one."
            action={
              <Link to="/contact" className={`text-sm font-semibold ${op.tealAccent}`}>
                Contact ops
              </Link>
            }
          />
        </div>
      ) : null}

      {!loading && conversations.length > 0 ? (
        <div className={`mt-3 ${op.listCard}`}>
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void openConversation(c)}
              className="flex w-full items-start gap-3 border-b border-border px-4 py-3.5 text-left last:border-b-0 active:bg-muted/50"
            >
              <div
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  c.unreadCount > 0 ? "bg-[#1eaeae]/15" : "bg-muted"
                }`}
              >
                <Send className={`h-4 w-4 ${c.unreadCount > 0 ? op.iconTeal : op.textMuted}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`truncate text-[15px] ${c.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                    {c.title || c.subject || "Notice"}
                  </p>
                  {c.unreadCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {c.preview || c.body || "Open conversation"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                    {audienceLabel(c.audience)}
                  </span>
                  {c.updatedAt ? <span>{formatUkDateTime(c.updatedAt)}</span> : null}
                </div>
              </div>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
            </button>
          ))}
        </div>
      ) : null}
    </DriverPageContainer>
  );
}
