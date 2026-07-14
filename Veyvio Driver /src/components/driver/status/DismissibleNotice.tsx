import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DismissibleNotice({
  title,
  children,
  onDismiss,
  tone = "warn",
  className,
  actions,
}: {
  title: string;
  children: ReactNode;
  onDismiss: () => void;
  tone?: "warn" | "vor" | "info" | "neutral";
  className?: string;
  actions?: ReactNode;
}) {
  const toneStyles = {
    warn: "border-warn/30 bg-warn/10",
    vor: "border-vor/30 bg-vor/10",
    info: "border-link/30 bg-link/5",
    neutral: "border-border bg-card",
  } as const;

  const titleStyles = {
    warn: "text-warn",
    vor: "text-vor",
    info: "text-link",
    neutral: "text-foreground",
  } as const;

  return (
    <div className={cn("rounded-xl border px-4 py-3 shadow-sm", toneStyles[tone], className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-bold", titleStyles[tone])}>{title}</p>
          <div className="mt-1 text-xs text-muted">{children}</div>
          {actions && <div className="mt-3">{actions}</div>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-foreground"
          aria-label={`Dismiss ${title}`}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
