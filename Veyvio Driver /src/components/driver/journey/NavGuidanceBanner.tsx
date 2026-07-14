import { ChevronDown, Loader2, Map, Navigation, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { TurnManeuverIcon } from "@/components/driver/journey/TurnManeuverIcon";
import { getHeadingStop, nextPassengerDetail } from "@/domain/journey/journey-helpers";
import {
  buildGoogleMapsDirectionsUrl,
  buildWazeNavigateUrl,
} from "@/domain/journey/external-navigation";
import { formatNavDistance } from "@/domain/journey/turn-by-turn-types";
import { useJourneyNavigation } from "@/features/navigation/use-journey-navigation";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/platform/navigation/open-external-url";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { useDrivingSafety } from "@/features/driver-focus/use-driving-safety";

const SWIPE_THRESHOLD_PX = 48;

export function NavGuidanceBanner({ dutyId }: { dutyId: string }) {
  const navigation = useJourneyNavigation(dutyId);
  const { canPerform, isRestricted } = useDrivingSafety();
  const heading = navigation.duty ? getHeadingStop(navigation.duty) : null;
  const passenger = heading ? nextPassengerDetail(heading) : null;
  const [expanded, setExpanded] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (clientY: number) => {
    touchStartY.current = clientY;
  };

  const handleTouchEnd = (clientY: number) => {
    if (touchStartY.current === null) return;
    const delta = clientY - touchStartY.current;
    if (delta > SWIPE_THRESHOLD_PX) setExpanded(true);
    if (delta < -SWIPE_THRESHOLD_PX) setExpanded(false);
    touchStartY.current = null;
  };

  if (navigation.status === "loading" || !navigation.route) {
    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[600]">
        <div className="flex items-center gap-3 rounded-xl bg-accent/95 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
          <Loader2 className="size-5 animate-spin text-driver-sky" />
          <p className="text-sm font-medium">Calculating road route…</p>
        </div>
      </div>
    );
  }

  const { currentStep, nextStep, driverPosition } = navigation;
  if (!currentStep) return null;

  const distance = formatNavDistance(currentStep.distanceM);
  const destinationLabel = heading?.name.split("—")[0]?.trim() ?? "Next stop";
  const destination = heading
    ? { lat: heading.latitude, lng: heading.longitude, label: destinationLabel }
    : null;

  const openGoogleMaps = () => {
    if (!destination) return;
    void openExternalUrl(
      buildGoogleMapsDirectionsUrl({
        destination,
        origin: driverPosition
          ? { lat: driverPosition[0], lng: driverPosition[1] }
          : null,
      }),
    );
  };

  const openWaze = () => {
    if (!destination) return;
    void openExternalUrl(buildWazeNavigateUrl(destination));
  };

  return (
    <div className="pointer-events-auto absolute inset-x-3 top-3 z-[600]">
      <div
        className="overflow-hidden rounded-xl shadow-[0_8px_28px_rgba(11,21,38,0.28)]"
        onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientY ?? 0)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientY ?? 0)}
      >
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 bg-ok/90 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/90"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide other navigation apps" : "Show Google Maps and Waze"}
        >
          <span className="h-1 w-8 rounded-full bg-white/35" aria-hidden />
          <ChevronDown
            className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")}
            aria-hidden
          />
          <span>{expanded ? "Swipe up to hide" : "Swipe down for other apps"}</span>
        </button>

        <div className="relative bg-ok px-4 py-3.5 text-white">
          <span className="absolute right-3 top-3 rounded-md bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
            On route
          </span>
          <div className="flex items-center gap-3 pr-16">
            <p className="shrink-0 font-display text-4xl font-extrabold leading-none tabular-nums">
              {distance}
            </p>
            <div className="flex min-w-0 items-start gap-2.5">
              <TurnManeuverIcon
                maneuverType={currentStep.maneuverType}
                modifier={currentStep.modifier}
                className="mt-1 shrink-0 text-white"
                size="md"
              />
              <p className="text-lg font-bold leading-snug">{currentStep.instruction}</p>
            </div>
          </div>
          {!isRestricted && passenger && (
            <p className="mt-2 truncate text-xs text-white/85">{passenger}</p>
          )}
          <button
            type="button"
            disabled={!canPerform("hear_instruction")}
            onClick={() => void driverFocusCoordinator.speakInstruction(currentStep.instruction)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            <Volume2 className="size-4" />
            Hear next instruction
          </button>
        </div>

        {nextStep && (
          <div className="flex items-center gap-2 bg-accent px-4 py-2.5 text-sm text-white">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-driver-sky">
              Then
            </span>
            <TurnManeuverIcon
              maneuverType={nextStep.maneuverType}
              modifier={nextStep.modifier}
              className="shrink-0 text-driver-sky"
              size="sm"
            />
            <p className="min-w-0 truncate font-medium">{nextStep.instruction}</p>
            <span className="ml-auto shrink-0 text-xs text-white/60">
              {formatNavDistance(nextStep.distanceM)}
            </span>
          </div>
        )}

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-2 border-t border-white/10 bg-accent px-4 py-3">
              <p className="text-xs text-white/70">
                Route to <span className="font-semibold text-white">{destinationLabel}</span> in an
                external app.
              </p>
              <button
                type="button"
                onClick={openGoogleMaps}
                disabled={!destination}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white px-4 text-left text-sm font-semibold text-accent disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#4285F4]/10 text-[#4285F4]">
                  <Map className="size-4" aria-hidden />
                </span>
                Open in Google Maps
              </button>
              <button
                type="button"
                onClick={openWaze}
                disabled={!destination}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[#33CCFF] px-4 text-left text-sm font-bold text-[#0B1526] disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/25">
                  <Navigation className="size-4" aria-hidden />
                </span>
                Open in Waze
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="w-full py-2 text-center text-xs font-medium text-white/65"
              >
                Continue in Veyvio Driver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
