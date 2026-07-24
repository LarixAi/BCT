import type { LucideIcon } from "lucide-react";
import { Bell, CheckSquare, Clock, Hourglass, Truck } from "lucide-react";
import { kpiCounts } from "@/domain/yard/kpi";
import { taskStats } from "@/domain/tasks/task-stats";
import type { Trip, Vehicle } from "@/types/yard";
import type { YardTask } from "@/types/tasks";
import { fleetReadinessSnapshot } from "./depot-readiness-series";

export type HomeKpiItem = {
  id: string;
  label: string;
  value: string | number;
  trend: number;
  icon: LucideIcon;
  to: "/" | "/yard" | "/tasks" | "/departure-line" | "/vor" | "/checks";
};

function trendFromDelta(current: number, baseline: number): number {
  if (baseline === 0) return current > 0 ? 5 : 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function buildHomeKpis(input: {
  vehicles: Vehicle[];
  trips: Trip[];
  tasks: YardTask[];
}): HomeKpiItem[] {
  const { vehicles, trips, tasks } = input;
  const counts = kpiCounts(vehicles);
  const stats = taskStats(tasks);
  const fleet = fleetReadinessSnapshot(vehicles);
  const blockedDepartures = trips.filter(t => !t.ready).length;
  const upcomingDepartures = trips.length;

  return [
    {
      id: "available",
      label: "Available vehicles",
      value: counts.available,
      trend: trendFromDelta(counts.available, Math.max(vehicles.length - counts.vor, 1)),
      icon: Truck,
      to: "/yard",
    },
    {
      id: "completed",
      label: "Tasks completed",
      value: stats.completed,
      trend: trendFromDelta(stats.completed, Math.max(stats.open, 1)),
      icon: CheckSquare,
      to: "/tasks",
    },
    {
      id: "pending",
      label: "Pending tasks",
      value: stats.open,
      trend: trendFromDelta(stats.open, stats.completed || 1),
      icon: Hourglass,
      to: "/tasks",
    },
    {
      id: "departures",
      label: "Upcoming departures",
      value: upcomingDepartures,
      trend: trendFromDelta(upcomingDepartures - blockedDepartures, upcomingDepartures || 1),
      icon: Bell,
      to: "/departure-line",
    },
    {
      id: "vor",
      label: "VOR vehicles",
      value: counts.vor.toString().padStart(2, "0"),
      trend: counts.vor > 0 ? -Math.min(8, counts.vor * 2) : 5,
      icon: Clock,
      to: "/vor",
    },
  ];
}

export function fleetReadyTrendPct(vehicles: Vehicle[], weekAvg: number): number {
  const fleet = fleetReadinessSnapshot(vehicles);
  if (weekAvg === 0) return 0;
  return Math.round(((fleet.pct - weekAvg) / weekAvg) * 100);
}
