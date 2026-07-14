import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ConversationCard } from "@/components/driver/messages/ConversationCard";
import { filterConversations } from "@/data/mocks/messages-inbox";
import { useMessagesStore } from "@/store/messages";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/messages/search")({
  head: () => ({ meta: [{ title: "Search messages — Veyvio Driver" }] }),
  component: SearchMessagesPage,
});

function SearchMessagesPage() {
  const inbox = useMessagesStore((s) => s.inbox);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const all = filterConversations(inbox.conversations, "all");
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.senderLabel.toLowerCase().includes(q),
    );
  }, [inbox.conversations, query]);

  return (
    <div className="animate-in-up space-y-4">
      <Link to="/messages" className="text-sm text-link">
        ‹ Messages
      </Link>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages…"
        autoFocus
      />

      {results.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted">
          <p className="font-semibold text-foreground">No messages found</p>
          <p className="mt-1">Try another search or remove a filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((conversation) => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  );
}
