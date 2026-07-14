import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import type { MessagesInboxPayload } from "@/types/messages";

export function MessagesHeader({
  inbox,
  onSearch,
  onNewMessage,
}: {
  inbox: MessagesInboxPayload;
  onSearch?: () => void;
  onNewMessage?: () => void;
}) {
  return (
    <header className="animate-in-up space-y-2 border-b border-border pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Messages</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Messages</h1>
          {inbox.unreadTotal > 0 && (
            <p className="mt-0.5 text-sm font-medium text-ok">{inbox.unreadTotal} unread</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onNewMessage && (
            <button
              type="button"
              onClick={onNewMessage}
              className="grid size-10 place-items-center rounded-full bg-primary text-white hover:bg-primary/90"
              aria-label="New message"
            >
              <Plus className="size-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onSearch}
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted hover:text-foreground"
            aria-label="Search messages"
          >
            <Search className="size-5" />
          </button>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted hover:text-foreground"
            aria-label="More options"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MessagesHeaderMenu({ onMarkAllRead }: { onMarkAllRead: () => void }) {
  return (
    <div className="flex gap-2 text-xs">
      <button type="button" className="font-semibold text-link" onClick={onMarkAllRead}>
        Mark all as read
      </button>
      <Link to="/messages" className="text-muted">
        Archived
      </Link>
    </div>
  );
}
