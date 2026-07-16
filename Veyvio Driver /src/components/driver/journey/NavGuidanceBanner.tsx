import { Map, Navigation } from "lucide-react";
import { useState } from "react";
import {
  getHeadingStop,
  inferStopKind,
  nextPassengerDetail,
  stopProgressLabel,
} from "@/domain/journey/journey-helpers";
import {
  buildGoogleMapsDirectionsUrl,
  buildWazeNavigateUrl,
} from "@/domain/journey/external-navigation";
import { useJourneyNavigation } from "@/features/navigation/use-journey-navigation";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/platform/navigation/open-external-url";
import type { StopKind } from "@/types/duty";

function stopKindLabel(kind: StopKind): string {
  switch (kind) {
    case "depot_departure":
      return "Depot departure";
    case "depot_return":
      return "Depot return";
    case "passenger_pickup":
      return "Passenger pick-up";
    case "passenger_dropoff":
      return "Passenger drop-off";
    case "driver_break":
      return "Driver break";
    case "fuel_stop":
      return "Fuel stop";
    case "vehicle_change":
      return "Vehicle change";
    default:
      return "Next stop";
  }
}

/** plannedArrival is often "06:45" — not always a full ISO timestamp. */
function formatPlannedTime(value?: string): string | null {
  if (!value) return null;
  if (/^\d{1,2}:\d{2}$/.test(value.trim())) return value.trim();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Duty context card stacked under Splash chrome (Home | pill | Safety).
 */
export function NavGuidanceBanner({ dutyId }: { dutyId: string }) {
  const navigation = useJourneyNavigation(dutyId);
  const [appsOpen, setAppsOpen] = useState(false);
  const duty = navigation.duty;
  const heading = duty ? getHeadingStop(duty) : null;
  const passenger = heading ? nextPassengerDetail(heading) : null;
  const kind = heading ? inferStopKind(heading) : null;
  const planned = formatPlannedTime(heading?.plannedArrival);

  if (navigation.status === "loading" || !navigation.route) {
    return (
      <div className="rounded-2xl bg-accent/95 px-4 py-3 text-white shadow-[0_10px_28px_rgba(16,24,40,0.22)] backdrop-blur-sm">
        <p className="text-sm font-medium text-driver-sky">Calculating road route…</p>
        {duty ? (
          <p className="mt-1 truncate text-xs text-white/75">
            {duty.routeName} · {duty.reference}
          </p>
        ) : null}
      </div>
    );
  }

  if (!duty || !heading) return null;

  const stopTitle = heading.name.split("—")[0]?.trim() ?? heading.name;
  const destination = {
    lat: heading.latitude,
    lng: heading.longitude,
    label: stopTitle,
  };

  const openGoogleMaps = () => {
    void openExternalUrl(
      buildGoogleMapsDirectionsUrl({
        destination,
        origin: navigation.driverPosition
          ? { lat: navigation.driverPosition[0], lng: navigation.driverPosition[1] }
          : null,
      }),
    );
  };

  const openWaze = () => {
    void openExternalUrl(buildWazeNavigateUrl(destination));
  };

  return (
    <div className="overflow-hidden rounded-2xl shadow-[0_10px_32px_rgba(11,21,38,0.28)]">
      <div className="relative bg-ok px-4 py-3.5 text-white">
        <span className="absolute right-3 top-3 rounded-md bg-white/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest">
          On route
        </span>
        <p className="pr-16 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/80">
          {kind ? stopKindLabel(kind) : "Next stop"}
          {duty.routeName ? ` · ${duty.routeName}` : ""}
        </p>
        <p className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-tight">
          {stopTitle}
        </p>
        {passenger ? (
          <p className="mt-1.5 truncate text-sm font-medium text-white/90">{passenger}</p>
        ) : heading.address ? (
          <p className="mt-1.5 truncate text-sm text-white/85">{heading.address}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/80">
          <span>{stopProgressLabel(duty)}</span>
          {duty.vehicle?.registrationNumber ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-bold tabular-nums tracking-wide">
                {duty.vehicle.registrationNumber}
              </span>
            </>
          ) : null}
          {planned ? (
            <>
              <span aria-hidden>·</span>
              <span>Planned {planned}</span>
            </>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 bg-accent px-4 py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-white"
        onClick={() => setAppsOpen((open) => !open)}
        aria-expanded={appsOpen}
      >
        <span>{appsOpen ? "Hide other apps" : "Open in Google Maps or Waze"}</span>
        <span
          className={cn("text-driver-sky transition-transform", appsOpen && "rotate-180")}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          appsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-white/10 bg-accent px-4 py-3">
            <button
              type="button"
              onClick={openGoogleMaps}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-white px-4 text-left text-sm font-semibold text-accent"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#4285F4]/10 text-[#4285F4]">
                <Map className="size-4" aria-hidden />
              </span>
              Open in Google Maps
            </button>
            <button
              type="button"
              onClick={openWaze}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[#33CCFF] px-4 text-left text-sm font-bold text-[#0B1526]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/25">
                <Navigation className="size-4" aria-hidden />
              </span>
              Open in Waze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
