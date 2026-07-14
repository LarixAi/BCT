import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessagesHeader, MessagesHeaderMenu } from "@/components/driver/messages/MessagesHeader";
import { UrgentMessageBanner } from "@/components/driver/messages/UrgentMessageBanner";
import { MessagesFilterBar } from "@/components/driver/messages/MessagesFilterBar";
import { ConversationCard } from "@/components/driver/messages/ConversationCard";
import { buildEmptyInbox, buildMockMessagesInbox, filterConversations } from "@/data/mocks/messages-inbox";
import { useMessagesStore } from "@/store/messages";
import type { MessageFilter } from "@/types/messages";
import { isOnline } from "@/platform/device/connectivity";

type MessagesDemo = "normal" | "empty" | "offline";

export const Route = createFileRoute("/_app/messages/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as MessagesDemo | undefined) ?? "normal",
  }),
  head: () => ({ meta: [{ title: "Messages — Veyvio Driver" }] }),
  component: MessagesInboxPage,
});

function MessagesInboxPage() {
  const { demo } = Route.useSearch();
  const navigate = useNavigate();
  const storeInbox = useMessagesStore((s) => s.inbox);
  const markAllRead = useMessagesStore((s) => s.markAllRead);
  const [filter, setFilter] = useState<MessageFilter>("all");

  const inbox = useMemo(() => {
    if (demo === "empty") return buildEmptyInbox();
    if (demo === "offline") return buildMockMessagesInbox();
    return storeInbox;
  }, [demo, storeInbox]);

  const conversations = filterConversations(inbox.conversations, filter);
  const online = isOnline();

  return (
    <div className="animate-in-up space-y-4 pb-4">
      <MessagesHeader
        inbox={inbox}
        onSearch={() => void navigate({ to: "/messages/search" })}
        onNewMessage={() => void navigate({ to: "/messages/new" })}
      />
      <MessagesHeaderMenu onMarkAllRead={markAllRead} />

      {!online && (
        <p className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
          You&apos;re offline. Downloaded messages are still available. New messages will send when your connection returns.
        </p>
      )}

      {inbox.urgent && !inbox.urgent.acknowledged && <UrgentMessageBanner urgent={inbox.urgent} />}

      <MessagesFilterBar active={filter} onChange={setFilter} />

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="font-display text-lg font-extrabold">You&apos;re all caught up</h2>
          <p className="mt-2 text-sm text-muted">
            Operational messages, trip updates and company announcements will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  );
}
