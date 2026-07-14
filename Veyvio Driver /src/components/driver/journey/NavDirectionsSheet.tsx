import { Link } from "@tanstack/react-router";
import { ChevronUp, List, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { TurnManeuverIcon } from "@/components/driver/journey/TurnManeuverIcon";
import { NavigationCustomFilters } from "@/components/driver/journey/NavigationCustomFilters";
import {
  remainingDistanceToStep,
  useJourneyNavigation,
} from "@/features/navigation/use-journey-navigation";
import {
  formatNavDistance,
  formatNavDuration,
} from "@/domain/journey/turn-by-turn-types";
import { cn } from "@/lib/utils";

export function NavDirectionsSheet({ dutyId }: { dutyId: string }) {
  const navigation = useJourneyNavigation(dutyId);
  const [expanded, setExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  if (!navigation.route) return null;

  const { route, currentStepIndex } = navigation;
  const remainingSteps = route.steps.slice(currentStepIndex);
  const legRemaining = formatNavDistance(remainingDistanceToStep(route.steps, currentStepIndex));

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] flex flex-col justify-end">
      <div
        className={cn(
          "pointer-events-auto mx-0 flex max-h-[58vh] flex-col rounded-t-2xl bg-card shadow-[0_-12px_40px_rgba(11,21,38,0.18)] transition-[max-height] duration-300 ease-out",
          expanded ? "max-h-[58vh]" : "max-h-[4.75rem]",
        )}
      >
        <button
          type="button"
          className="flex w-full shrink-0 items-center gap-3 border-b border-border px-4 py-3 text-left"
          onClick={() => {
            setExpanded((open) => !open);
            if (expanded) setShowFilters(false);
          }}
          aria-expanded={expanded}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-link/10 text-link">
            <List className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold tabular-nums leading-none">
              {formatNavDuration(route.totalDurationS)}
            </p>
            <p className="mt-1 truncate text-xs text-muted">
              {legRemaining} · {route.destinationName}
              {navigation.etaClock ? ` · Arrive ${navigation.etaClock}` : ""}
            </p>
          </div>
          <ChevronUp
            className={cn("size-5 shrink-0 text-muted transition-transform", expanded && "rotate-180")}
          />
        </button>

        {expanded && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Directions</p>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-link"
                onClick={() => setShowFilters((open) => !open)}
              >
                <SlidersHorizontal className="size-3.5" />
                {showFilters ? "Hide" : "Filters"}
              </button>
            </div>

            {showFilters && (
              <div className="border-b border-border px-4 py-3">
                <NavigationCustomFilters dutyId={dutyId} />
              </div>
            )}

            <ol className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {remainingSteps.map((step, index) => (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3",
                    index === 0 ? "bg-driver-blue-soft" : "border-b border-border/70 last:border-0",
                  )}
                >
                  <div
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
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
                    <p className={cn("text-sm leading-snug", index === 0 && "font-semibold text-foreground")}>
                      {step.instruction}
                    </p>
                    {step.streetName && index > 0 && (
                      <p className="mt-0.5 truncate text-xs text-muted">{step.streetName}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                    {formatNavDistance(step.distanceM)}
                  </span>
                </li>
              ))}
            </ol>

            <div className="space-y-3 border-t border-border px-4 py-4 pb-safe">
              <Link
                to={`/duties/${dutyId}/nav/focus`}
                className="flex min-h-12 items-center justify-center rounded-xl bg-accent px-4 text-sm font-bold text-white"
              >
                Next pick up
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={`/duties/${dutyId}/nav/stops`}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground"
                >
                  Stop list
                </Link>
                <Link
                  to={`/duties/${dutyId}/nav/overview`}
                  className="flex min-h-12 items-center justify-center rounded-xl bg-link px-4 text-sm font-bold text-white"
                >
                  Overview
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
