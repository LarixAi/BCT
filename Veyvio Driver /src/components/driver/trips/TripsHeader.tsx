import { syncStatusLabel } from "@/domain/home/home-helpers";
import { formatScheduleDate } from "@/domain/trips/trip-helpers";
import type { DriverHomeSummary } from "@/types/home";
import { SyncStatusBadge } from "@/components/driver/status/SyncStatusBadge";

export function TripsHeader({ summary }: { summary: Pick<DriverHomeSummary, "sync"> }) {
  const today = formatScheduleDate(new Date().toISOString().slice(0, 10));
  const syncLabel = syncStatusLabel({ sync: summary.sync } as DriverHomeSummary);

  return (
    <header className="animate-in-up space-y-2 border-b border-border pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Trips</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{today}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
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
