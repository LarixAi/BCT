import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import type { DriverRequiredAction } from "@/types/home";
import { HomeCard, HomeCardLabel, HomeCardTitle } from "./HomeCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const priorityOrder: DriverRequiredAction["priority"][] = [
  "safety_critical",
  "work_blocking",
  "journey_related",
  "compliance",
  "information",
];

const priorityTone: Record<DriverRequiredAction["priority"], string> = {
  safety_critical: "border-vor/40 bg-vor/5",
  work_blocking: "border-warn/40 bg-warn/5",
  journey_related: "border-link/30 bg-link/5",
  compliance: "border-border bg-secondary/30",
  information: "border-border bg-card",
};

export function RequiredActionsSection({ actions }: { actions: DriverRequiredAction[] }) {
  if (actions.length === 0) return null;

  const sorted = [...actions].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );

  return (
    <HomeCard tone="amber">
      <HomeCardLabel>Action required</HomeCardLabel>
      <HomeCardTitle>{sorted.length} item{sorted.length === 1 ? "" : "s"} need attention</HomeCardTitle>
      <ul className="mt-3 space-y-2">
        {sorted.map((action) => (
          <li
            key={action.id}
            className={cn("rounded-xs border p-3", priorityTone[action.priority])}
          >
            <div className="flex items-start gap-2">
              {(action.priority === "safety_critical" || action.priority === "work_blocking") && (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{action.title}</p>
                <p className="mt-0.5 text-xs text-muted">{action.description}</p>
                {action.href ? (
                  <Button
                    asChild
                    variant={
                      action.priority === "work_blocking" || action.priority === "safety_critical"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="mt-2"
                  >
                    <Link to={action.href}>{action.actionLabel}</Link>
                  </Button>
                ) : (
                  <Button
                    variant={
                      action.priority === "work_blocking" || action.priority === "safety_critical"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="mt-2"
                  >
                    {action.actionLabel}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
