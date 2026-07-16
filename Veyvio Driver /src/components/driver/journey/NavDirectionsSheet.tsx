import { Link } from "@tanstack/react-router";
import { ChevronUp, Map, Navigation, SlidersHorizontal, Volume2 } from "lucide-react";
import { useState } from "react";
import { TurnManeuverIcon } from "@/components/driver/journey/TurnManeuverIcon";
import { NavigationCustomFilters } from "@/components/driver/journey/NavigationCustomFilters";
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
import {
  remainingDistanceToStep,
  useJourneyNavigation,
} from "@/features/navigation/use-journey-navigation";
import {
  formatNavDistance,
  formatNavDuration,
} from "@/domain/journey/turn-by-turn-types";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/platform/navigation/open-external-url";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { useDrivingSafety } from "@/features/driver-focus/use-driving-safety";
import type { StopKind } from "@/types/duty";

type SheetTab = "directions" | "duty";

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
 * Bottom nav sheet: collapsed current maneuver · expand for Directions | Duty tabs.
 */
export function NavDirectionsSheet({ dutyId }: { dutyId: string }) {
  const navigation = useJourneyNavigation(dutyId);
  const { canPerform } = useDrivingSafety();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<SheetTab>("directions");
  const [showFilters, setShowFilters] = useState(false);

  const duty = navigation.duty;
  const heading = duty ? getHeadingStop(duty) : null;
  const passenger = heading ? nextPassengerDetail(heading) : null;
  const kind = heading ? inferStopKind(heading) : null;
  const stopTitle = heading
    ? (heading.name.split("—")[0]?.trim() ?? heading.name)
    : null;
  const planned = formatPlannedTime(heading?.plannedArrival);

  if (!navigation.route && navigation.status !== "loading") return null;

  const route = navigation.route;
  const currentStep = navigation.currentStep;
  const nextStep = navigation.nextStep;
  const remainingSteps = route?.steps.slice(navigation.currentStepIndex) ?? [];
  const legRemaining = route
    ? formatNavDistance(remainingDistanceToStep(route.steps, navigation.currentStepIndex))
    : null;

  const openTab = (next: SheetTab) => {
    setTab(next);
    setExpanded(true);
    if (next !== "directions") setShowFilters(false);
  };

  const openGoogleMaps = () => {
    if (!heading || !stopTitle) return;
    void openExternalUrl(
      buildGoogleMapsDirectionsUrl({
        destination: { lat: heading.latitude, lng: heading.longitude, label: stopTitle },
        origin: navigation.driverPosition
          ? { lat: navigation.driverPosition[0], lng: navigation.driverPosition[1] }
          : null,
      }),
    );
  };

  const openWaze = () => {
    if (!heading || !stopTitle) return;
    void openExternalUrl(
      buildWazeNavigateUrl({
        lat: heading.latitude,
        lng: heading.longitude,
        label: stopTitle,
      }),
    );
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[30] flex flex-col justify-end">
      <div
        className={cn(
          "pointer-events-auto mx-0 flex max-h-[68vh] flex-col rounded-t-[28px] bg-white/98 shadow-[0_-12px_38px_rgba(16,24,40,0.18)] transition-[max-height] duration-300 ease-out",
          expanded ? "max-h-[68vh]" : "max-h-[11.5rem]",
        )}
      >
        <button
          type="button"
          className="flex w-full shrink-0 flex-col items-stretch text-left"
          onClick={() => {
            setExpanded((open) => !open);
            if (expanded) setShowFilters(false);
          }}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse sheet" : "Expand sheet"}
        >
          <div className="grid h-8 w-full place-items-center">
            <span className="h-1.5 w-[52px] rounded-full bg-[#D0D5DD]" aria-hidden />
          </div>

          {currentStep && route ? (
            <div className="flex items-start gap-3 border-b border-border px-4 pb-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-ok text-white">
                <TurnManeuverIcon
                  maneuverType={currentStep.maneuverType}
                  modifier={currentStep.modifier}
                  size="md"
                  className="text-white"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-[26px] font-extrabold tabular-nums leading-none tracking-tight">
                    {formatNavDistance(currentStep.distanceM)}
                  </p>
                  <p className="truncate text-xs font-extrabold uppercase tracking-wide text-muted">
                    {formatNavDuration(route.totalDurationS)}
                    {navigation.etaClock ? ` · ${navigation.etaClock}` : ""}
                  </p>
                </div>
                <p className="mt-1.5 text-[15px] font-bold leading-snug text-foreground">
                  {currentStep.instruction}
                </p>
                {nextStep && !expanded ? (
                  <p className="mt-1 truncate text-xs text-muted">
                    Then {nextStep.instruction} · {formatNavDistance(nextStep.distanceM)}
                  </p>
                ) : (
                  <p className="mt-1 truncate text-xs text-muted">
                    {legRemaining} · {route.destinationName}
                  </p>
                )}
              </div>
              <ChevronUp
                className={cn(
                  "mt-1 size-5 shrink-0 text-muted transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 border-b border-border px-4 pb-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-[22px] font-extrabold leading-none">
                  {navigation.status === "loading" ? "Routing…" : route ? formatNavDuration(route.totalDurationS) : "—"}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {stopTitle ?? "Next stop"}
                  {duty?.routeName ? ` · ${duty.routeName}` : ""}
                </p>
              </div>
              <ChevronUp
                className={cn(
                  "size-5 shrink-0 text-muted transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </div>
          )}
        </button>

        {expanded ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1"
              role="tablist"
              aria-label="Navigation sheet"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "directions"}
                className={cn(
                  "min-h-10 rounded-full text-xs font-extrabold uppercase tracking-wide transition-colors",
                  tab === "directions"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted",
                )}
                onClick={() => openTab("directions")}
              >
                Directions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "duty"}
                className={cn(
                  "min-h-10 rounded-full text-xs font-extrabold uppercase tracking-wide transition-colors",
                  tab === "duty" ? "bg-accent text-white shadow-sm" : "text-muted",
                )}
                onClick={() => openTab("duty")}
              >
                Duty
              </button>
            </div>

            {tab === "directions" ? (
              <>
                {currentStep ? (
                  <div className="border-b border-border px-4 py-3">
                    <button
                      type="button"
                      disabled={!canPerform("hear_instruction")}
                      onClick={() =>
                        void driverFocusCoordinator.speakInstruction(currentStep.instruction)
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-driver-blue-soft px-3.5 text-xs font-extrabold text-link disabled:opacity-40"
                    >
                      <Volume2 className="size-4" />
                      Hear next instruction
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                    Turn by turn
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-driver-blue-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-link"
                    onClick={() => setShowFilters((open) => !open)}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    {showFilters ? "Hide" : "Filters"}
                  </button>
                </div>

                {showFilters ? (
                  <div className="border-b border-border px-4 py-3">
                    <NavigationCustomFilters dutyId={dutyId} />
                  </div>
                ) : null}

                <ol className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                  {remainingSteps.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-muted">
                      {navigation.status === "loading"
                        ? "Calculating road route…"
                        : "No remaining steps"}
                    </li>
                  ) : (
                    remainingSteps.map((step, index) => (
                      <li
                        key={step.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-3",
                          index === 0
                            ? "bg-driver-blue-soft"
                            : "border-b border-border/70 last:border-0",
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-full",
                            index === 0 ? "bg-link text-white" : "bg-secondary text-muted",
                          )}
                        >
                          <TurnManeuverIcon
                            maneuverType={step.maneuverType}
                            modifier={step.modifier}
                            size="sm"
                            className={index === 0 ? "text-white" : undefined}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              index === 0 && "font-semibold text-foreground",
                            )}
                          >
                            {step.instruction}
                          </p>
                          {step.streetName && index > 0 ? (
                            <p className="mt-0.5 truncate text-xs text-muted">{step.streetName}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                          {formatNavDistance(step.distanceM)}
                        </span>
                      </li>
                    ))
                  )}
                </ol>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {duty && heading && stopTitle ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
                        {kind ? stopKindLabel(kind) : "Next stop"}
                        <span className="ml-2 rounded-md bg-ok/15 px-1.5 py-0.5 text-ok">
                          On route
                        </span>
                      </p>
                      <p className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-tight">
                        {stopTitle}
                      </p>
                      {heading.address ? (
                        <p className="mt-1.5 text-sm leading-snug text-muted">{heading.address}</p>
                      ) : null}
                    </div>

                    <dl className="grid gap-3 rounded-2xl bg-secondary/80 p-3.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Route</dt>
                        <dd className="text-right font-semibold">{duty.routeName}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Duty</dt>
                        <dd className="text-right font-semibold tabular-nums">{duty.reference}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Progress</dt>
                        <dd className="text-right font-semibold">{stopProgressLabel(duty)}</dd>
                      </div>
                      {duty.vehicle?.registrationNumber ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Vehicle</dt>
                          <dd className="text-right font-extrabold tracking-wide tabular-nums">
                            {duty.vehicle.registrationNumber}
                          </dd>
                        </div>
                      ) : null}
                      {passenger ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Passenger</dt>
                          <dd className="max-w-[60%] text-right font-semibold">{passenger}</dd>
                        </div>
                      ) : null}
                      {planned ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Planned</dt>
                          <dd className="text-right font-semibold tabular-nums">{planned}</dd>
                        </div>
                      ) : null}
                      {duty.passengerCount > 0 ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Passengers on duty</dt>
                          <dd className="text-right font-semibold tabular-nums">
                            {duty.passengerCount}
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    <div className="space-y-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                        External navigation
                      </p>
                      <button
                        type="button"
                        onClick={openGoogleMaps}
                        className="flex min-h-12 w-full items-center gap-3 rounded-[14px] border border-border bg-card px-4 text-left text-sm font-semibold"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#4285F4]/10 text-[#4285F4]">
                          <Map className="size-4" aria-hidden />
                        </span>
                        Open in Google Maps
                      </button>
                      <button
                        type="button"
                        onClick={openWaze}
                        className="flex min-h-12 w-full items-center gap-3 rounded-[14px] bg-[#33CCFF] px-4 text-left text-sm font-bold text-[#0B1526]"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/25">
                          <Navigation className="size-4" aria-hidden />
                        </span>
                        Open in Waze
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted">Duty details unavailable</p>
                )}
              </div>
            )}

            <div
              className="space-y-3 border-t border-border px-4 pt-4"
              style={{
                paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
              }}
            >
              <Link
                to={`/duties/${dutyId}/nav/focus`}
                className="flex min-h-12 items-center justify-center rounded-[14px] bg-accent px-4 text-sm font-extrabold uppercase tracking-wide text-white"
              >
                Next pick up
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={`/duties/${dutyId}/nav/stops`}
                  className="flex min-h-12 items-center justify-center rounded-[14px] border border-border bg-card px-4 text-sm font-bold text-foreground"
                >
                  Stop list
                </Link>
                <Link
                  to={`/duties/${dutyId}/nav/overview`}
                  className="flex min-h-12 items-center justify-center rounded-[14px] bg-link px-4 text-sm font-extrabold text-white"
                >
                  Overview
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
