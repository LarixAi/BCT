import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { formatMessageTime } from "@/domain/messages/message-helpers";
import type { ConversationSummary } from "@/types/messages";
import { cn } from "@/lib/utils";

export function ConversationCard({ conversation }: { conversation: ConversationSummary }) {
  const unread = conversation.unreadCount > 0;

  return (
    <Link
      to={`/messages/${conversation.id}`}
      className={cn(
        "block rounded-xl border p-4 shadow-sm transition-colors",
        unread ? "border-ok/25 bg-ok/5" : "border-border bg-card hover:bg-secondary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {unread && <span className="size-2 shrink-0 rounded-full bg-ok" aria-label="Unread" />}
            {conversation.isAnnouncement ? (
              <Megaphone className="size-4 shrink-0 text-muted" aria-hidden />
            ) : null}
            <p className={cn("text-sm font-semibold", unread && "font-bold")}>{conversation.senderLabel}</p>
          </div>
          <p className="text-xs text-muted">{conversation.subject}</p>
          <p className={cn("line-clamp-2 text-sm", unread ? "font-medium text-foreground" : "text-muted")}>
            {conversation.preview}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-muted">{formatMessageTime(conversation.updatedAt)}</span>
          {unread && (
            <span className="grid min-w-5 place-items-center rounded-full bg-ok px-1.5 text-[10px] font-bold text-white">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>

      {conversation.context?.vehicleRegistration && (
        <p className="mt-2 font-mono text-xs text-muted">Vehicle {conversation.context.vehicleRegistration}</p>
      )}
    </Link>
  );
}
