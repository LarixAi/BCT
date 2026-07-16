import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";

type FlowKind = "open" | "end";

const titles: Record<FlowKind, string> = {
  open: "Open journey",
  end: "End journey",
};

/**
 * Open/end journey wizard — full white page · ← back · step bar · content.
 * Viewport-locked so primary actions never sit under the home indicator.
 */
export function JourneyFlowShell({
  kind,
  step,
  total = 4,
  routeLabel,
  backTo,
  backLabel = "Back",
  footer,
  children,
}: {
  kind: FlowKind;
  step: number;
  total?: number;
  routeLabel: string;
  backTo: string;
  backLabel?: string;
  /** Sticky primary actions — kept above safe-area, outside the scroll region. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const stripActive = shouldShowVehicleCheckRequiredStrip(homeSummary);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-card text-foreground",
        /* Strip owns top safe-area when active; otherwise pad for status bar. */
        stripActive ? "pt-3" : "pt-safe",
      )}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col px-5 pt-4">
        <header className="shrink-0 pb-1">
          <Link to={backTo} className="text-sm font-semibold text-muted">
            ← {backLabel}
          </Link>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-[22px] font-extrabold tracking-tight text-foreground">
                {titles[kind]}
              </h1>
              <p className="mt-1 text-sm text-muted">{routeLabel}</p>
            </div>
            <p className="shrink-0 text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Step {step} of {total}
            </p>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-link" : "bg-border")}
                aria-hidden
              />
            ))}
          </div>
        </header>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto pt-5",
            footer ? "pb-4" : undefined,
          )}
          style={
            footer
              ? undefined
              : { paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))" }
          }
        >
          {children}
        </div>

        {footer ? (
          <div
            className="shrink-0 border-t border-border/60 bg-card pt-3"
            style={{
              paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
