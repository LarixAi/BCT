import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Home, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJourneyNavigation } from "@/features/navigation/use-journey-navigation";
import { useDriverStore } from "@/store/driver";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { JourneyMap } from "./JourneyMap";

/**
 * Splash MapNav language: full-bleed map · Midnight locator pill · floating Home/Safety ·
 * duty overlay stacked under chrome · directions sheet · no BottomNav.
 */
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
  mapOverlay?: ReactNode;
  mapBottomSheet?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const navigation = useJourneyNavigation(dutyId);
  const headerEta = navigation.etaLabel ?? eta;
  const headerStop = navigation.route?.destinationName ?? nextStop;
  const guidanceMode = Boolean(mapOverlay || mapBottomSheet);
  const stripActive = shouldShowVehicleCheckRequiredStrip(
    useDriverStore((s) => s.homeSummary),
  );

  return (
    <div className="h-full min-h-0 bg-[#E8EEF4]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden bg-[#E8EEF4]">
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

            {/* Chrome + duty overlay in normal flow so they cannot overlap */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col gap-3 px-4",
                stripActive ? "pt-2" : "pt-safe",
              )}
            >
              <div className="pointer-events-auto grid grid-cols-[54px_1fr_54px] items-center gap-3 pt-2.5">
                <Link
                  to="/duties/$dutyId/journey/active"
                  params={{ dutyId }}
                  search={{ demo: undefined }}
                  className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
                  aria-label="Back to journey"
                >
                  <Home className="size-7" strokeWidth={2} />
                </Link>
                <div className="min-w-0 justify-self-center rounded-full bg-accent px-[18px] py-3 text-center text-white shadow-[0_10px_28px_rgba(16,24,40,0.22)]">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-driver-sky">
                    Veyvio Driver
                  </p>
                  <p className="mt-0.5 truncate text-[15px] font-extrabold leading-tight">{headerStop}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/70">
                    ETA {headerEta}
                    {navigation.etaClock ? ` · ${navigation.etaClock}` : ""}
                  </p>
                </div>
                <Link
                  to="/duties/$dutyId/help"
                  params={{ dutyId }}
                  className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
                  aria-label="Safety help"
                >
                  <ShieldCheck className="size-7" strokeWidth={2} />
                </Link>
              </div>

              {mapOverlay ? <div className="pointer-events-auto min-w-0">{mapOverlay}</div> : null}
            </div>

            {mapBottomSheet}
          </div>

          {children ? (
            <div className="relative z-20 flex-1 overflow-y-auto rounded-t-[28px] border-t border-border bg-white/98 px-4 py-4 shadow-[0_-12px_38px_rgba(16,24,40,0.18)]">
              <div className="mx-auto mb-3 h-1.5 w-[52px] rounded-full bg-[#D0D5DD]" aria-hidden />
              {children}
            </div>
          ) : null}
        </div>

        {footer ? (
          <footer
            className="relative z-20 shrink-0 rounded-t-[28px] border-t border-border bg-white px-4 pt-4 shadow-[0_-12px_38px_rgba(16,24,40,0.12)]"
            style={{
              paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-[52px] rounded-full bg-[#D0D5DD]" aria-hidden />
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
