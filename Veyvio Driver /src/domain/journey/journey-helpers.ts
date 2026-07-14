import type { DutyDetail, DutyStop } from "@/types/duty";
import type { TripStop } from "@/types/trips";
import { dutyStopsToTripStops } from "@/domain/journey/open-journey-helpers";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";

export function getActiveRun(duty: DutyDetail) {
  return duty.runs.find((r) => r.status === "active") ?? duty.runs[0];
}

export function getCurrentStopIndex(stops: DutyStop[]): number {
  const idx = stops.findIndex(
    (s) => s.status !== "completed" && s.status !== "skipped",
  );
  return idx === -1 ? Math.max(0, stops.length - 1) : idx;
}

export function stopsWithProgress(duty: DutyDetail): TripStop[] {
  const run = getActiveRun(duty);
  if (!run) return [];

  const base = dutyStopsToTripStops({ ...duty, runs: [run] });
  const currentIdx = getCurrentStopIndex(run.stops);

  return base.map((stop, index) => {
    if (index < currentIdx) return { ...stop, status: "completed" as const };
    if (index === currentIdx) return { ...stop, status: "arrived" as const };
    return { ...stop, status: "pending" as const };
  });
}

export function getHeadingStop(duty: DutyDetail): DutyStop | null {
  const run = getActiveRun(duty);
  if (!run) return null;
  return run.stops.find((s) => s.status !== "completed" && s.status !== "skipped") ?? null;
}

export function stopProgressLabel(duty: DutyDetail): string {
  const run = getActiveRun(duty);
  if (!run) return "";
  const current = getCurrentStopIndex(run.stops);
  return `Stop ${current + 1} of ${run.stops.length}`;
}

export function journeyStartedLabel(duty: DutyDetail): string {
  if (!duty.startedAt) return "In service";
  return `In service since ${new Date(duty.startedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function nextPassengerDetail(stop: DutyStop | null): string | null {
  if (!stop) return null;
  const task = stop.passengerTasks[0];
  if (!task) return null;
  const profile = getPassengerProfile(task.passengerId);
  const parts = [profile?.preferredName ?? task.passengerName];
  if (profile?.journeySummary) parts.push(profile.journeySummary);
  else if (task.accessibilityNotes) parts.push(task.accessibilityNotes.replace(/—.*/, "").trim());
  return parts.join(" · ");
}
