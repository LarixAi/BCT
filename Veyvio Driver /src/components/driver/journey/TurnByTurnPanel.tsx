import { Link } from "@tanstack/react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NavigationCustomFilters } from "@/components/driver/journey/NavigationCustomFilters";
import { TurnManeuverIcon } from "@/components/driver/journey/TurnManeuverIcon";
import {
  remainingDistanceToStep,
  useJourneyNavigation,
} from "@/features/navigation/use-journey-navigation";
import { nextPassengerDetail, getHeadingStop } from "@/domain/journey/journey-helpers";
import { formatNavDistance, formatNavDuration } from "@/domain/journey/turn-by-turn-types";
import { NAVIGATION_ROUTE_FILTERS } from "@/types/driver-filters";
import { useDriverPreferencesStore } from "@/store/driver-preferences";
import { formatTime } from "@/lib/utils";

export function TurnByTurnPanel({
  dutyId,
  variant = "default",
  showActions = true,
}: {
  dutyId: string;
  variant?: "default" | "compact";
  showActions?: boolean;
}) {
  const navigation = useJourneyNavigation(dutyId);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const routeFilter = useDriverPreferencesStore((s) => s.navigationRouteFilter);
  const routeFilterLabel =
    NAVIGATION_ROUTE_FILTERS.find((option) => option.id === routeFilter)?.label ?? "Fastest";
  const heading = navigation.duty ? getHeadingStop(navigation.duty) : null;
  const passenger = heading ? nextPassengerDetail(heading) : null;

  if (navigation.status === "loading" || !navigation.route) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        <Loader2 className="size-4 animate-spin text-link" />
        Calculating road route…
      </div>
    );
  }

  const { route, currentStep, nextStep, upcomingSteps, currentStepIndex } = navigation;
  const distanceToCurrent = currentStep ? formatNavDistance(currentStep.distanceM) : "—";
  const legRemaining = formatNavDistance(remainingDistanceToStep(route.steps, currentStepIndex));

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {currentStep && (
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-link/10 text-link">
              <TurnManeuverIcon
                maneuverType={currentStep.maneuverType}
                modifier={currentStep.modifier}
                size="md"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Now</p>
              <p className="font-display text-lg font-extrabold leading-tight">{currentStep.instruction}</p>
              <p className="mt-1 text-sm text-muted">In {distanceToCurrent}</p>
            </div>
          </div>
        )}
        {nextStep && (
          <p className="text-sm text-muted">
            Then · {nextStep.instruction} in {formatNavDistance(nextStep.distanceM)}
          </p>
        )}
      </div>
    );
  }

  const visibleSteps = showAllSteps ? route.steps.slice(currentStepIndex + 1) : upcomingSteps;

  return (
    <div className="space-y-4">
      {currentStep && (
        <section className="flex items-start gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-accent text-white">
            <TurnManeuverIcon
              maneuverType={currentStep.maneuverType}
              modifier={currentStep.modifier}
              size="lg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Next manoeuvre</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight">
              {currentStep.instruction}
            </h1>
            <p className="mt-2 text-sm text-muted">
              In {distanceToCurrent}
              {heading ? ` · ${formatTime(heading.plannedArrival)} arrival` : ""}
            </p>
            {passenger && <p className="mt-1 text-sm font-medium">{passenger}</p>}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium">{route.destinationName}</span>
          <span className="text-muted">{legRemaining} remaining</span>
          <span className="text-muted">{formatNavDuration(route.totalDurationS)}</span>
          {route.source === "osrm" && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-ok">Road route</span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{routeFilterLabel}</span>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted"
          onClick={() => setShowFilters((open) => !open)}
        >
          Custom filters
          <ChevronDown className={`size-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        {showFilters && (
          <div className="border-t border-border px-3 py-3">
            <NavigationCustomFilters dutyId={dutyId} />
          </div>
        )}
      </section>

      {nextStep && (
        <section className="rounded-lg border border-border bg-card px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Then</p>
          <div className="mt-2 flex items-start gap-2">
            <TurnManeuverIcon
              maneuverType={nextStep.maneuverType}
              modifier={nextStep.modifier}
              className="mt-0.5 text-link"
              size="sm"
            />
            <div>
              <p className="text-sm font-semibold">{nextStep.instruction}</p>
              <p className="text-xs text-muted">In {formatNavDistance(nextStep.distanceM)}</p>
            </div>
          </div>
        </section>
      )}

      {visibleSteps.length > 0 && (
        <section>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-[10px] font-bold uppercase tracking-widest text-muted"
            onClick={() => setShowAllSteps((open) => !open)}
          >
            Upcoming directions
            <ChevronDown className={`size-4 transition-transform ${showAllSteps ? "rotate-180" : ""}`} />
          </button>
          <ol className="mt-2 space-y-2">
            {visibleSteps.map((step) => (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                <TurnManeuverIcon
                  maneuverType={step.maneuverType}
                  modifier={step.modifier}
                  className="mt-0.5 shrink-0 text-muted"
                  size="sm"
                />
                <div>
                  <p>{step.instruction}</p>
                  <p className="text-xs text-muted">{formatNavDistance(step.distanceM)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {showActions && (
        <>
          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to={`/duties/${dutyId}/nav/focus`}>Next pick up focus</Link>
          </Button>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest">
            <Link
              to={`/duties/${dutyId}/nav/stops`}
              className="rounded-md border border-border py-3 text-center text-muted"
            >
              Stop list
            </Link>
            <Link to={`/duties/${dutyId}/nav/overview`} className="rounded-md bg-link py-3 text-center text-white">
              Route overview
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
