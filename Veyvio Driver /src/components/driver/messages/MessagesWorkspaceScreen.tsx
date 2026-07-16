import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Inbox,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  avatarInitials,
  avatarTone,
  buildMessagesWorkspaceView,
  selectFocusedConversation,
  type MessagesSheetSize,
} from "@/domain/messages/messages-workspace-view";
import { formatMessageTime } from "@/domain/messages/message-helpers";
import { useDutiesSheetDrag } from "@/features/duty/use-duties-sheet-drag";
import { useWorkspaceMapChrome } from "@/features/duty/use-workspace-map-chrome";
import { isOnline } from "@/platform/device/connectivity";
import { cn } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { useMessagesStore } from "@/store/messages";
import type { MessagesInboxPayload } from "@/types/messages";

export function MessagesWorkspaceScreen({
  inbox,
  initialConversationId,
}: {
  inbox: MessagesInboxPayload;
  initialConversationId?: string;
}) {
  const navigate = useNavigate();
  const getConversation = useMessagesStore((s) => s.getConversation);
  const acknowledgeUrgent = useMessagesStore((s) => s.acknowledgeUrgent);
  const acknowledgeConversation = useMessagesStore((s) => s.acknowledgeConversation);
  const markAllRead = useMessagesStore((s) => s.markAllRead);
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const drivingSafetyMode = useDriverStore((s) => s.drivingSafetyMode);

  const [sheetSize, setSheetSize] = useState<MessagesSheetSize>("medium");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxOverview, setInboxOverview] = useState(false);
  const [focusedId, setFocusedId] = useState<string | undefined>(initialConversationId);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const { maxExpandedHeight, topChromeStyle, fabBottom } = useWorkspaceMapChrome(rootRef);
  const { dragging, liveHeight, bindDrag } = useDutiesSheetDrag(sheetSize, setSheetSize, {
    maxExpandedHeight,
  });

  useEffect(() => {
    if (initialConversationId) {
      setFocusedId(initialConversationId);
      setInboxOverview(false);
    }
  }, [initialConversationId]);

  const focusSummary = useMemo(() => {
    if (inboxOverview) return undefined;
    return selectFocusedConversation(inbox, focusedId);
  }, [inbox, focusedId, inboxOverview]);

  const conversation = useMemo(() => {
    if (!focusSummary) return null;
    return getConversation(focusSummary.id);
  }, [focusSummary, getConversation, inbox]);

  // Refresh detail when store conversations change (acks / sends)
  const storeDetails = useMessagesStore((s) =>
    focusSummary ? s.conversationDetails[focusSummary.id] : undefined,
  );
  const liveConversation = storeDetails ?? conversation;

  const view = useMemo(
    () =>
      buildMessagesWorkspaceView({
        inbox,
        conversation: liveConversation,
        drivingSafetyMode,
        online: isOnline(),
        inboxOverview: inboxOverview || !liveConversation,
      }),
    [inbox, liveConversation, drivingSafetyMode, inboxOverview],
  );

  useEffect(() => {
    if (view.stage === "urgent" || view.stage === "ack" || view.stage === "driving") {
      setSheetSize((s) => (s === "collapsed" ? "medium" : s));
    }
  }, [view.stage]);

  const quickBottom = fabBottom(liveHeight);

  function selectConversation(id: string) {
    setFocusedId(id);
    setInboxOverview(false);
    setInboxOpen(false);
    setSheetSize("medium");
    useMessagesStore.getState().markConversationRead(id);
  }

  function runPrimary() {
    const id = liveConversation?.id ?? focusSummary?.id;
    switch (view.primaryAction) {
      case "open_urgent":
        if (inbox.urgent) selectConversation(inbox.urgent.conversationId);
        break;
      case "acknowledge":
        if (id) {
          acknowledgeConversation(id);
          if (inbox.urgent?.conversationId === id) acknowledgeUrgent();
        }
        break;
      case "view_conversation":
        if (id) selectConversation(id);
        else if (inbox.conversations.find((c) => c.unreadCount > 0)) {
          selectConversation(inbox.conversations.find((c) => c.unreadCount > 0)!.id);
        }
        break;
      case "call_ops":
        void navigate({ to: "/more/support" });
        break;
      case "open_when_stopped":
        setSheetSize("expanded");
        break;
      case "start_safeguarding":
        void navigate({ to: "/messages/new", search: { type: "safeguarding" } });
        break;
      case "view_resolution":
        if (id) void navigate({ to: "/messages/$conversationId", params: { conversationId: id } });
        break;
      case "none":
        void navigate({ to: "/messages/new", search: { type: undefined } });
        break;
    }
  }

  function runSecondary1() {
    if (view.secondary1.action === "mark_all_read") {
      markAllRead();
      return;
    }
    if (view.secondary1.action === "call_ops" || view.secondary1.action === "call_999") {
      void navigate({ to: "/more/support" });
      return;
    }
    if (view.stage === "urgent" && view.secondary2.label === "Acknowledge") {
      /* handled by secondary2 */
    }
    if (view.secondary1.href?.startsWith("/trips")) {
      void navigate({ to: "/trips", search: { demo: "normal", dutyId: undefined } });
      return;
    }
    if (view.secondary1.href) void navigate({ to: view.secondary1.href as "/more/support" });
  }

  function runSecondary2() {
    if (view.secondary2.action === "acknowledge" || view.stage === "urgent") {
      const id = liveConversation?.id ?? focusSummary?.id;
      if (id) {
        acknowledgeConversation(id);
        if (inbox.urgent?.conversationId === id) acknowledgeUrgent();
      }
      return;
    }
    if (view.secondary2.href?.startsWith("/trips")) {
      const dutyId = new URLSearchParams(view.secondary2.href.split("?")[1] ?? "").get("dutyId");
      void navigate({ to: "/trips", search: { demo: "normal", dutyId: dutyId ?? undefined } });
      return;
    }
    if (view.secondary2.href?.startsWith("/messages/")) {
      const id = view.secondary2.href.replace("/messages/", "");
      if (id && id !== "new") {
        void navigate({ to: "/messages/$conversationId", params: { conversationId: id } });
      }
      return;
    }
    if (view.secondary2.href === "/messages/new") {
      void navigate({ to: "/messages/new", search: { type: undefined } });
    }
  }

  function handleSend() {
    const body = draft.trim();
    const id = liveConversation?.id;
    if (!body || !id || !view.showComposer) return;
    sendMessage(id, body);
    setDraft("");
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#EEF2F6] text-foreground"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(47,107,255,0.13), transparent 32%), linear-gradient(180deg, #f9fbfd 0%, #edf2f7 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(11,21,38,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(11,21,38,0.025) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
      </div>

      <div
        className="absolute left-0 right-0 z-20 grid grid-cols-[54px_1fr_54px] items-center gap-3 px-4"
        style={topChromeStyle}
      >
        <Link
          to="/"
          aria-label="Home"
          className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
        >
          <Home className="size-7" strokeWidth={2} />
        </Link>
        <button
          type="button"
          onClick={() => {
            setInboxOverview(true);
            setInboxOpen(true);
          }}
          className="min-w-[180px] max-w-[230px] justify-self-center rounded-full bg-accent px-[18px] py-2.5 text-center text-white shadow-[0_10px_28px_rgba(16,24,40,0.22)]"
        >
          <strong className="block text-[15px] font-extrabold">Messages</strong>
          <span className="mt-0.5 block truncate text-[11px] text-white/70">{view.pillSub}</span>
        </button>
        <Link
          to="/more/support"
          aria-label="Safety centre"
          className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
        >
          <ShieldCheck className="size-7" strokeWidth={2} />
        </Link>
      </div>

      {/* Thread canvas */}
      <div
        className={cn(
          "absolute inset-x-[18px] top-[102px] overflow-auto px-1 pb-7 scrollbar-none",
          !dragging && "transition-[bottom] duration-250",
        )}
        style={{ bottom: liveHeight + 8 }}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {view.contextChips.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className={cn(
                "rounded-full border border-border bg-white/94 px-2.5 py-2 text-[11px] font-bold text-muted shadow-[0_7px_18px_rgba(16,24,40,0.08)]",
                i === 0 && "border-[rgba(47,107,255,0.22)] bg-[rgba(239,246,255,0.96)] text-link",
              )}
            >
              {chip}
            </span>
          ))}
        </div>

        <p className="my-3 text-center text-[11px] font-bold text-muted">Today</p>

        {view.bubbles.length === 0 ? (
          <div className="rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-muted shadow-[0_8px_22px_rgba(16,24,40,0.08)]">
            Select a conversation from the inbox to read operational messages.
          </div>
        ) : (
          view.bubbles.map((bubble) =>
            bubble.direction === "system" ? (
              <p key={bubble.id} className="my-3 text-center text-[11px] font-bold text-muted">
                {bubble.body}
              </p>
            ) : (
              <div
                key={bubble.id}
                className={cn(
                  "my-2 max-w-[84%] rounded-[18px] px-[15px] py-[13px] text-sm leading-relaxed shadow-[0_8px_22px_rgba(16,24,40,0.08)]",
                  bubble.direction === "out" &&
                    "ml-auto rounded-br-md bg-accent text-white",
                  bubble.direction === "in" &&
                    "rounded-bl-md border border-border bg-white",
                  bubble.urgent && bubble.direction === "in" &&
                    "border-[rgba(217,45,32,0.28)] bg-[#FEF3F2]",
                )}
              >
                {bubble.sender ? (
                  <p
                    className={cn(
                      "mb-1 text-[11px] font-extrabold uppercase tracking-wide text-link",
                      bubble.urgent && "text-vor",
                    )}
                  >
                    {bubble.sender}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap">{bubble.body}</p>
                {bubble.structuredFields?.length ? (
                  <div className="mt-2.5 grid gap-1 border-t border-[rgba(102,112,133,0.22)] pt-2">
                    {bubble.structuredFields.map((f) => (
                      <div key={f.label} className="flex justify-between gap-3 text-xs">
                        <span className={bubble.direction === "out" ? "text-white/70" : "text-muted"}>
                          {f.label}
                        </span>
                        <strong>{f.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p
                  className={cn(
                    "mt-1.5 text-[10px] text-muted",
                    bubble.direction === "out" && "text-white/66",
                  )}
                >
                  {bubble.meta}
                </p>
              </div>
            ),
          )
        )}
      </div>

      {sheetSize !== "expanded" ? (
        <div
          className={cn(
            "absolute right-4 z-20 grid gap-3",
            !dragging && "transition-[bottom] duration-250",
          )}
          style={{ bottom: quickBottom }}
        >
          <Link
            to="/messages/new"
            search={{ type: undefined }}
            aria-label="New approved message"
            className="grid size-[50px] place-items-center rounded-full bg-white text-link shadow-[0_10px_24px_rgba(16,24,40,0.18)]"
          >
            <Plus className="size-6" />
          </Link>
          <Link
            to="/messages/new"
            search={{ type: "safeguarding" }}
            aria-label="Safeguarding message"
            className="grid size-[50px] place-items-center rounded-full bg-white text-vor shadow-[0_10px_24px_rgba(16,24,40,0.18)]"
          >
            <ShieldAlert className="size-6" />
          </Link>
        </div>
      ) : null}

      <section
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[28px] bg-white/99 shadow-[0_-12px_38px_rgba(16,24,40,0.18)]",
          !dragging && "transition-[height] duration-250 ease-out",
        )}
        style={{ height: liveHeight }}
        data-size={sheetSize}
      >
        <div
          {...bindDrag}
          className="flex-none touch-none select-none"
          role="slider"
          aria-label="Messages sheet height — swipe up or down"
          aria-valuetext={sheetSize}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSheetSize((s) =>
                s === "collapsed" ? "medium" : s === "medium" ? "expanded" : "expanded",
              );
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSheetSize((s) =>
                s === "expanded" ? "medium" : s === "medium" ? "collapsed" : "collapsed",
              );
            }
          }}
        >
          <div className="grid h-10 w-full place-items-center">
            <span className="h-1.5 w-[52px] rounded-full bg-[#D0D5DD]" />
          </div>
          <div className="grid grid-cols-[48px_1fr_48px] items-center border-b border-border px-4 pb-3">
            <button
              type="button"
              aria-label="Expand message filters and conversations"
              onClick={(e) => {
                e.stopPropagation();
                setSheetSize("expanded");
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-[42px] place-items-center rounded-[14px] bg-[#F2F4F7] text-accent"
            >
              <SlidersHorizontal className="size-[23px]" />
            </button>
            <div className="pointer-events-none min-w-0 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
                {view.stageLabel}
              </p>
              <p className="mt-0.5 truncate text-lg font-extrabold tracking-tight">
                {view.stageTitle}
              </p>
            </div>
            <button
              type="button"
              aria-label="Open inbox"
              onClick={(e) => {
                e.stopPropagation();
                setInboxOpen(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-[42px] place-items-center rounded-[14px] bg-[#F2F4F7] text-accent"
            >
              <Inbox className="size-[23px]" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-[18px] pb-6 pt-4">
          <div
            className={cn(
              "mb-2.5 inline-flex rounded-full px-2.5 py-1.5 text-xs font-extrabold",
              view.toneClass === "ok" && "bg-[#ECFDF3] text-ok",
              view.toneClass === "warn" && "bg-[#FFF7ED] text-warn",
              view.toneClass === "red" && "bg-[#FEF3F2] text-vor",
              !view.toneClass && "bg-[#EFF6FF] text-link",
            )}
          >
            {view.toneLabel}
          </div>

          <h2 className="text-[25px] font-extrabold leading-[1.08] tracking-tight">{view.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{view.copy}</p>

          {sheetSize !== "collapsed" ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border-t border-border pt-2.5">
                <small className="block text-muted">{view.meta1.label}</small>
                <strong className="mt-1 block text-sm">{view.meta1.value}</strong>
              </div>
              <div className="border-t border-border pt-2.5">
                <small className="block text-muted">{view.meta2.label}</small>
                <strong className="mt-1 block text-sm">{view.meta2.value}</strong>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={runPrimary}
            className={cn(
              "mt-[18px] min-h-[52px] w-full rounded-[14px] bg-accent text-sm font-extrabold text-white",
              view.primaryTone === "ok" && "bg-ok",
              view.primaryTone === "warn" && "bg-warn",
              view.primaryTone === "red" && "bg-vor",
            )}
          >
            {view.primaryLabel}
          </button>

          {sheetSize !== "collapsed" ? (
            <>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={runSecondary1}
                  className="grid min-h-11 place-items-center rounded-xl border border-border bg-white text-[13px] font-bold"
                >
                  {view.secondary1.label}
                </button>
                <button
                  type="button"
                  onClick={runSecondary2}
                  className="grid min-h-11 place-items-center rounded-xl border border-border bg-white text-[13px] font-bold"
                >
                  {view.secondary2.label}
                </button>
              </div>

              {view.showComposer && !drivingSafetyMode ? (
                <div className="mt-3.5 grid grid-cols-[1fr_50px] gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    rows={2}
                    className="min-h-[50px] max-h-[110px] resize-y rounded-[14px] border border-border bg-[#F9FAFB] px-3.5 py-3 text-sm"
                  />
                  <button
                    type="button"
                    aria-label="Send message"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    className="rounded-[14px] bg-link text-xl font-extrabold text-white disabled:opacity-40"
                  >
                    ↑
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {sheetSize === "expanded" ? (
            <div className="mt-[22px] space-y-[22px] border-t border-border pt-[18px]">
              <section>
                <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  Conversations
                </h3>
                {view.conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-2.5 border-b border-border py-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full bg-[#EFF6FF] text-xs font-extrabold text-link",
                        avatarTone(c.priority, c.senderTeam, c.requiresAcknowledgement && !c.acknowledged) ===
                          "red" && "bg-[#FEF3F2] text-vor",
                        avatarTone(c.priority, c.senderTeam) === "ok" && "bg-[#ECFDF3] text-ok",
                      )}
                    >
                      {avatarInitials(c.senderLabel, c.senderTeam)}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm">
                        {c.senderLabel}
                        {c.context?.routeName ? ` · ${c.context.routeName}` : ""}
                      </strong>
                      <span className="mt-0.5 block truncate text-xs text-muted">{c.subject}</span>
                    </span>
                    {c.unreadCount > 0 ? (
                      <b className="grid min-w-5 place-items-center rounded-full bg-link px-1.5 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </b>
                    ) : (
                      <span className="text-[11px] text-muted">{formatMessageTime(c.updatedAt)}</span>
                    )}
                  </button>
                ))}
              </section>

              <section>
                <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  Approved message types
                </h3>
                {view.approvedTypes.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() =>
                      void navigate({
                        to: "/messages/new",
                        search: { type: row.id },
                      })
                    }
                    className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-2.5 border-b border-border py-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full bg-[#EFF6FF] text-xs font-extrabold text-link",
                        row.tone === "red" && "bg-[#FEF3F2] text-vor",
                      )}
                    >
                      {row.initials}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm">{row.title}</strong>
                      <span className="mt-0.5 block text-xs text-muted">{row.subtitle}</span>
                    </span>
                    <b className="text-xs font-bold text-link">Open</b>
                  </button>
                ))}
              </section>
            </div>
          ) : null}
        </div>
      </section>

      {inboxOpen ? (
        <div
          className="absolute inset-0 z-40 flex items-end bg-[rgba(11,21,38,0.45)]"
          role="dialog"
          aria-label="Inbox"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInboxOpen(false);
          }}
        >
          <div className="max-h-[82%] w-full overflow-auto rounded-t-[28px] bg-white px-[18px] pb-6 pt-3.5 shadow-[0_-18px_45px_rgba(16,24,40,0.22)]">
            <header className="flex items-center justify-between py-1.5 pb-3.5">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Inbox</h2>
              <button
                type="button"
                aria-label="Close inbox"
                onClick={() => setInboxOpen(false)}
                className="grid size-[42px] place-items-center rounded-full bg-[#F2F4F7]"
              >
                <X className="size-5" />
              </button>
            </header>

            {inbox.conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-2.5 border-b border-border py-3.5 text-left"
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-full bg-[#EFF6FF] text-xs font-extrabold text-link",
                    avatarTone(c.priority, c.senderTeam, c.requiresAcknowledgement && !c.acknowledged) ===
                      "red" && "bg-[#FEF3F2] text-vor",
                    avatarTone(c.priority, c.senderTeam) === "ok" && "bg-[#ECFDF3] text-ok",
                  )}
                >
                  {avatarInitials(c.senderLabel, c.senderTeam)}
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm">
                    {c.senderLabel}
                    {c.context?.routeName ? ` · ${c.context.routeName}` : ""}
                  </strong>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {c.requiresAcknowledgement && !c.acknowledged
                      ? "Urgent update · acknowledgement required"
                      : c.preview}
                  </span>
                </span>
                <b className="text-[11px] font-bold text-link">
                  {c.unreadCount > 0 ? `${c.unreadCount} unread` : "Read"}
                </b>
              </button>
            ))}

            <Link
              to="/messages/search"
              className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-link"
              onClick={() => setInboxOpen(false)}
            >
              <Search className="size-4" />
              Search messages
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
