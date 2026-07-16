import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";

/**
 * Focused chrome — full white page · ← back · title · content.
 * No elevated sheet, handle, or grey gutters (matches onboarding / Account style).
 */
export function FocusedPageShell({
  title,
  backTo,
  backLabel = "Back",
  onBack,
  eyebrow,
  subtitle,
  footer,
  children,
  className,
  flush = false,
}: {
  title: string;
  backTo?: string;
  backLabel?: string;
  /** In-page back (wizard steps) — preferred over backTo when set. */
  onBack?: () => void;
  /** Uppercase stage label above body. */
  eyebrow?: string;
  subtitle?: string;
  /** Sticky primary actions above safe-area (outside scroll). */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Slightly denser body pad — content owns scroll (e.g. threads). */
  flush?: boolean;
}) {
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const stripActive = shouldShowVehicleCheckRequiredStrip(homeSummary);

  const backControl = onBack ? (
    <button type="button" onClick={onBack} className="text-sm font-semibold text-muted">
      ← {backLabel}
    </button>
  ) : backTo ? (
    <Link to={backTo} className="text-sm font-semibold text-muted">
      ← {backLabel}
    </Link>
  ) : null;

  return (
    <div
      role="main"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-card text-foreground",
        stripActive ? "pt-3" : "pt-safe",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-lg flex-col px-5 pt-4",
          footer ? "" : "pb-cta-safe",
        )}
      >
        <header className="shrink-0 pb-1">
          {backControl}
          <h1 className="mt-2 font-display text-[22px] font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm leading-snug text-muted">{subtitle}</p> : null}
        </header>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            flush ? "pt-3" : "overflow-y-auto pt-4",
            footer ? "pb-4" : "",
          )}
        >
          {eyebrow ? (
            <p className="mb-3 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              {eyebrow}
            </p>
          ) : null}
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
