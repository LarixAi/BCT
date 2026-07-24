import type { Trip, Vehicle } from "@/types/yard";

export type DayReadiness = {
  dayIndex: number;
  label: string;
  /** Upper ribbon — fleet ready % */
  readinessPct: number;
  /** Lower ribbon — serviceable floor % */
  lowerPct: number;
  ready: number;
  blocked: number;
  isToday: boolean;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Reference-style ribbon offsets (percent points below upper line). */
const BAND_OFFSETS = [14, 11, 16, 12, 15, 13];

function jsDayToMondayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function fleetReadinessSnapshot(vehicles: Vehicle[]): { ready: number; blocked: number; pct: number } {
  if (vehicles.length === 0) return { ready: 0, blocked: 0, pct: 0 };
  const ready = vehicles.filter(v => v.status === "Available" || v.status === "On Departure Line").length;
  const blocked = vehicles.length - ready;
  const pct = Math.round((ready / vehicles.length) * 1000) / 10;
  return { ready, blocked, pct };
}

/** Departure readiness for the current shift window. */
export function departureReadinessSnapshot(trips: Trip[]): { ready: number; blocked: number; pct: number } {
  if (trips.length === 0) return { ready: 0, blocked: 0, pct: 0 };
  const ready = trips.filter(t => t.ready).length;
  const blocked = trips.length - ready;
  const pct = Math.round((ready / trips.length) * 1000) / 10;
  return { ready, blocked, pct };
}

/**
 * Six-day ribbon series anchored on today's live fleet picture.
 * Upper/lower curves drive the canvas band — not historical telemetry.
 */
export function buildDepotReadinessSeries(vehicles: Vehicle[]): DayReadiness[] {
  const todayIndex = jsDayToMondayIndex(new Date().getDay());
  const snapshot = fleetReadinessSnapshot(vehicles);
  const upperOffsets = [-5.5, -3.2, -1.8, 0, 1.4, 2.6];

  return WEEKDAY_LABELS.map((label, dayIndex) => {
    const isToday = dayIndex === todayIndex;
    const readinessPct = isToday
      ? snapshot.pct
      : Math.min(98, Math.max(42, Math.round((snapshot.pct + (upperOffsets[dayIndex] ?? 0)) * 10) / 10));
    const lowerPct = Math.max(35, readinessPct - (BAND_OFFSETS[dayIndex] ?? 12));
    const ready = isToday
      ? snapshot.ready
      : Math.round((readinessPct / 100) * Math.max(vehicles.length, 1));
    const blocked = isToday
      ? snapshot.blocked
      : Math.max(0, vehicles.length - ready);

    return {
      dayIndex,
      label,
      readinessPct,
      lowerPct,
      ready,
      blocked,
      isToday,
    };
  });
}
