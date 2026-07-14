import { syncStatusLabel } from "@/domain/home/home-helpers";
import type { DriverHomeSummary } from "@/types/home";

export function ChecksHeader({ sync }: { sync: DriverHomeSummary["sync"] }) {
  const label = syncStatusLabel({ sync } as DriverHomeSummary);

  return (
    <header className="animate-in-up space-y-2 border-b border-border pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Vehicle checks</p>
          <h1 className="font-display text-xl font-extrabold tracking-tight">
            Make sure your vehicle is safe before starting duty.
          </h1>
        </div>
        <p
          className={`shrink-0 text-xs font-medium ${sync.online ? "text-ok" : "text-warn"}`}
          aria-live="polite"
        >
          {label}
        </p>
      </div>
    </header>
  );
}
