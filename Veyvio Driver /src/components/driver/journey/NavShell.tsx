import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJourneyNavigation } from "@/features/navigation/use-journey-navigation";
import { JourneyMap } from "./JourneyMap";
import { JourneyHelpLauncher } from "./JourneyHelpLauncher";

export function NavShell({
  dutyId,
  eta,
  nextStop,
  mapHighlight = "current",
  mapClassName,
  mapOverlay,
  mapBottomSheet,
  children,
  footer,
}: {
  dutyId: string;
  eta: string;
  nextStop: string;
  mapHighlight?: "current" | "diversion" | "off-route";
  mapClassName?: string;
  /** Floating guidance UI over the map (Waze / Google Maps style). */
  mapOverlay?: ReactNode;
  /** Bottom sheet for directions list and trip summary. */
  mapBottomSheet?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const navigation = useJourneyNavigation(dutyId);
  const headerEta = navigation.etaLabel ?? eta;
  const headerStop = navigation.route?.destinationName ?? nextStop;
  const guidanceMode = Boolean(mapOverlay || mapBottomSheet);

  return (
    <div className="min-h-dvh bg-secondary">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background">
        <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-accent pt-safe text-white">
          <div
            className="h-0.5 w-full bg-gradient-to-r from-driver-blue via-driver-sky to-transparent"
            aria-hidden
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link
              to={`/duties/${dutyId}/journey/active`}
              className="inline-flex min-w-0 items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/55"
            >
              <ArrowLeft className="size-4 shrink-0" />
              Journey
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-driver-sky/80">
                Veyvio Driver
              </p>
              <p className="truncate text-xs font-extrabold">{headerStop}</p>
              <p className="text-[10px] text-driver-sky">
                ETA {headerEta}
                {navigation.etaClock ? ` · ${navigation.etaClock}` : ""}
              </p>
            </div>
            <Navigation className="size-5 shrink-0 text-driver-sky" aria-hidden />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "relative min-h-0 flex-1",
              guidanceMode ? "flex flex-col" : "flex min-h-0 flex-1 flex-col",
            )}
          >
            <JourneyMap
              dutyId={dutyId}
              highlight={mapHighlight}
              fullBleed
              hideStatusOverlay={guidanceMode}
              className={cn(
                guidanceMode ? "absolute inset-0 h-full w-full" : "min-h-[min(46vh,420px)] flex-1 rounded-none",
                mapClassName,
              )}
            />
            {mapOverlay}
            {mapBottomSheet}
          </div>

          {children && <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>}
          <JourneyHelpLauncher dutyId={dutyId} />
        </div>

        {footer && (
          <footer className="shrink-0 rounded-t-2xl border-t border-border bg-card px-4 py-4 pb-safe shadow-[0_-10px_32px_rgba(11,21,38,0.08)]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
