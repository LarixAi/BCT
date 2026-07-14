import type { DutyDetail, DutyRun, DutyStop } from "@/types/duty";

/** Resolve a run/journey by canonical journeyId or run id. */
export function resolveJourneyRun(duty: DutyDetail, journeyId?: string | null): DutyRun | undefined {
  if (!journeyId) return undefined;
  return (
    duty.runs.find((r) => r.journeyId === journeyId) ??
    duty.runs.find((r) => r.id === journeyId)
  );
}

export function journeyKey(run: DutyRun): string {
  return run.journeyId ?? run.id;
}

/**
 * Active journey for ops UI: store hint → status active → next scheduled → primary → first run.
 */
export function getActiveJourneyId(duty: DutyDetail, preferredId?: string | null): string {
  if (preferredId && resolveJourneyRun(duty, preferredId)) {
    return preferredId;
  }
  const active = duty.runs.find((r) => r.status === "active");
  if (active) return journeyKey(active);

  const next = duty.runs.find((r) => r.status === "scheduled" || r.status === "paused");
  if (next) return journeyKey(next);

  if (duty.primaryJourneyId && resolveJourneyRun(duty, duty.primaryJourneyId)) {
    return duty.primaryJourneyId;
  }

  return duty.runs[0] ? journeyKey(duty.runs[0]) : "";
}

export function getActiveJourney(duty: DutyDetail, preferredId?: string | null): DutyRun | undefined {
  return resolveJourneyRun(duty, getActiveJourneyId(duty, preferredId)) ?? duty.runs.find((r) => r.status === "active");
}

/** Next journey still to run (scheduled/paused), excluding an optional journey being completed. */
export function getNextJourney(duty: DutyDetail, excludingJourneyId?: string | null): DutyRun | undefined {
  return duty.runs.find((r) => {
    if (r.status !== "scheduled" && r.status !== "paused") return false;
    if (!excludingJourneyId) return true;
    return journeyKey(r) !== excludingJourneyId && r.id !== excludingJourneyId;
  });
}

/** True when another non-completed journey remains after excluding the current one. */
export function hasRemainingJourneys(duty: DutyDetail, excludingJourneyId?: string | null): boolean {
  return duty.runs.some((r) => {
    if (r.status === "completed") return false;
    if (!excludingJourneyId) return true;
    return journeyKey(r) !== excludingJourneyId && r.id !== excludingJourneyId;
  });
}

/** Custody ends only when no further journeys need the vehicle. */
export function custodyEndsAfterJourney(duty: DutyDetail, completingJourneyId: string): boolean {
  return !hasRemainingJourneys(duty, completingJourneyId);
}

export function getActiveStop(duty: DutyDetail, preferredJourneyId?: string | null): DutyStop | null {
  const run = getActiveJourney(duty, preferredJourneyId);
  if (!run) return null;
  return run.stops.find((s) => s.status !== "completed" && s.status !== "skipped") ?? null;
}
