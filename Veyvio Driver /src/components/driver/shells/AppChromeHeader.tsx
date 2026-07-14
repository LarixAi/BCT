import { Link } from "@tanstack/react-router";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { SyncStatusBadge } from "@/components/driver/status/SyncStatusBadge";
import { useDriverStore } from "@/store/driver";

export function AppChromeHeader() {
  const depotName = useDriverStore((s) => s.homeSummary.driver.depotName);

  return (
    <header className="sticky top-0 z-40 bg-accent pt-safe text-white shadow-md shadow-black/25">
      {/* Thick brand rail — unmistakable Driver Blue on Midnight */}
      <div className="h-1 w-full bg-link" aria-hidden />
      <div className="mx-auto max-w-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" aria-label="Veyvio Driver home" className="shrink-0">
              <BrandWordmark size="header" theme="on-dark" align="left" />
            </Link>
            <div className="h-8 w-px shrink-0 bg-white/20" aria-hidden />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-driver-sky">Depot</p>
              <p className="truncate text-xs font-extrabold tracking-wide text-white">
                {depotName.toUpperCase()}
              </p>
            </div>
          </div>
          <SyncStatusBadge />
        </div>
      </div>
    </header>
  );
}
