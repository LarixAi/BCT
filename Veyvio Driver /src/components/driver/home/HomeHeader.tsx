import { homeOperationalHeadline, syncStatusLabel } from "@/domain/home/home-helpers";
import type { DriverHomeSummary } from "@/types/home";
import { SyncStatusBadge } from "@/components/driver/status/SyncStatusBadge";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function HomeHeader({ summary }: { summary: DriverHomeSummary }) {
  const headline = homeOperationalHeadline(summary);
  const syncLabel = syncStatusLabel(summary);

  return (
    <header className="animate-in-up space-y-4">
      {/* Brand chip — survives removing chrome and still reads as Veyvio */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-accent px-3.5 py-3 text-white">
        <BrandWordmark size="chrome" theme="on-dark" align="left" showAccent={false} />
        <p className="max-w-[9rem] text-right text-[9px] font-semibold uppercase leading-snug tracking-[0.12em] text-driver-sky/90">
          Know your vehicle before you move.
        </p>
      </div>

      <div className="space-y-3 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-accent">
              {headline}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {summary.driver.depotName} · {summary.driver.companyName}
            </p>
          </div>
          <button
            type="button"
            className="relative grid size-11 place-items-center rounded-full bg-accent text-sm font-bold text-white ring-2 ring-link"
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
