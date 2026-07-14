import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UrgentMessage } from "@/types/messages";
import { cn } from "@/lib/utils";

export function UrgentMessageBanner({ urgent }: { urgent: UrgentMessage }) {
  if (urgent.acknowledged) return null;

  const isCritical = urgent.priority === "critical";

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        isCritical ? "border-vor/40 bg-vor/10" : "border-warn/40 bg-warn/5",
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className={cn("mt-0.5 size-5 shrink-0", isCritical ? "text-vor" : "text-warn")} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-warn">
            Urgent operational update
          </p>
          <h2 className="font-display text-base font-extrabold tracking-tight">{urgent.title}</h2>
          <p className="text-sm">{urgent.body}</p>
          {urgent.detailLines?.map((line) => (
            <p key={line} className="text-sm font-medium text-warn">
              {line}
            </p>
          ))}
          <Button asChild size="sm" className="mt-1">
            <Link to={`/messages/${urgent.conversationId}`}>{urgent.actionLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
