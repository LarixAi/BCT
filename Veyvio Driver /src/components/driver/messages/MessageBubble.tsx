import { formatMessageTime } from "@/domain/messages/message-helpers";
import type { MessageItem } from "@/types/messages";
import { cn } from "@/lib/utils";

export function MessageBubble({ message, hidePreview }: { message: MessageItem; hidePreview?: boolean }) {
  if (hidePreview && !message.isOwn) {
    return (
      <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
        Message preview hidden while driving. Review at your next safe stop.
      </div>
    );
  }

  if (message.messageType === "system_event") {
    return (
      <p className="text-center text-xs text-muted">{message.body}</p>
    );
  }

  const isInstruction = message.messageType === "instruction" || message.messageType === "structured_update";

  return (
    <div className={cn("flex", message.isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm",
          message.isOwn
            ? "bg-primary text-primary-foreground"
            : isInstruction
              ? "border border-link/25 bg-link/5"
              : "border border-border bg-card",
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
          {message.senderLabel} · {formatMessageTime(message.createdAt)}
        </p>
        <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
        {message.structuredFields && (
          <dl className="mt-2 space-y-1 border-t border-border/50 pt-2 text-xs">
            {message.structuredFields.map((f) => (
              <div key={f.label} className="flex justify-between gap-2">
                <dt className="opacity-70">{f.label}</dt>
                <dd className="font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {message.deliveryStatus === "waiting" && (
          <p className="mt-1 text-[10px] opacity-70">Waiting for connection</p>
        )}
        {message.requiresAcknowledgement && !message.acknowledged && (
          <p className="mt-2 text-xs font-semibold text-warn">Acknowledgement required</p>
        )}
      </div>
    </div>
  );
}
