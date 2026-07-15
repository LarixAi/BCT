import { homeOperationalHeadline, syncStatusLabel } from "@/domain/home/home-helpers";
import type { DriverHomeSummary } from "@/types/home";
import { SyncStatusBadge } from "@/components/driver/status/SyncStatusBadge";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { BRAND_CAMPAIGN, BRAND_PRODUCT } from "@/components/brand/brand-copy";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Home first composition: Veyvio Driver brand, then operational headline.
 * Matches docs/brand/veyvio-driver-brand-foundation.md — status/ops before stats, brand unmistakable.
 */
export function HomeHeader({ summary }: { summary: DriverHomeSummary }) {
  const headline = homeOperationalHeadline(summary);
  const syncLabel = syncStatusLabel(summary);

  return (
    <header className="animate-in-up space-y-4">
      {/* Brand band — Midnight + Driver Blue rail + lockup + campaign */}
      <div className="overflow-hidden rounded-2xl bg-accent text-white shadow-md shadow-black/20">
        <div className="h-1 w-full bg-link" aria-hidden />
        <div className="relative px-4 pb-4 pt-3.5">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-driver-blue/25 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <BrandWordmark size="chrome" theme="on-dark" align="left" showAccent />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-driver-sky">
                {BRAND_PRODUCT}
              </p>
              <p className="max-w-[16rem] text-xs font-medium leading-snug text-white/75">
                {BRAND_CAMPAIGN}
              </p>
            </div>
            <button
              type="button"
              className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold text-white ring-2 ring-link"
              aria-label="Driver profile"
            >
              {initials(summary.driver.displayName)}
              {summary.driver.unreadNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-vor text-[9px] font-bold text-white">
                  {summary.driver.unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Operational meaning first — never a generic welcome */}
      <div className="space-y-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-accent">
            {headline}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {summary.driver.depotName} · {summary.driver.companyName}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={`text-xs font-medium ${summary.sync.online ? "text-ok" : "text-warn"}`}
            aria-live="polite"
          >
            {syncLabel}
          </p>
          <SyncStatusBadge />
        </div>
      </div>
    </header>
  );
}
