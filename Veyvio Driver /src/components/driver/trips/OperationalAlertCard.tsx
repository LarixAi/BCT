import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationalAlert } from "@/types/trips";
import { cn } from "@/lib/utils";

const priorityTone: Record<OperationalAlert["priority"], string> = {
  safety: "border-vor/40 bg-vor/5",
  blocking: "border-warn/40 bg-warn/5",
  information: "border-link/30 bg-link/5",
};

export function OperationalAlertCard({ alert }: { alert: OperationalAlert }) {
  return (
    <section
      className={cn("rounded-xl border p-4 shadow-sm", priorityTone[alert.priority])}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            {alert.type.replace(/_/g, " ")}
          </p>
          <h2 className="font-display text-base font-extrabold tracking-tight">{alert.title}</h2>
          <p className="text-sm text-muted">{alert.description}</p>
          {alert.actionHref ? (
            <Button asChild size="sm" className="mt-1 w-full sm:w-auto">
              <Link to={alert.actionHref}>{alert.actionLabel}</Link>
            </Button>
          ) : (
            <Button size="sm" className="mt-1 w-full sm:w-auto">
              {alert.actionLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
