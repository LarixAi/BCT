import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarClock, CalendarDays, Clock } from "lucide-react";
import type { UpcomingItem } from "@/types/upcoming";
import { countByBucket } from "@/domain/upcoming/upcoming-scheduling";

export type UpcomingKpiItem = {
  id: string;
  label: string;
  value: number;
  trend: number;
  icon: LucideIcon;
  bucket: "overdue" | "today" | "week" | "month" | "all";
};

export function buildUpcomingKpis(items: UpcomingItem[]): UpcomingKpiItem[] {
  const counts = countByBucket(items);
  return [
    {
      id: "overdue",
      label: "Overdue",
      value: counts.overdue,
      trend: counts.overdue > 0 ? -12 : 4,
      icon: AlertTriangle,
      bucket: "overdue",
    },
    {
      id: "today",
      label: "Due today",
      value: counts.today,
      trend: counts.today > 3 ? 8 : -3,
      icon: Clock,
      bucket: "today",
    },
    {
      id: "week",
      label: "Next 7 days",
      value: counts.week,
      trend: 6,
      icon: CalendarDays,
      bucket: "week",
    },
    {
      id: "month",
      label: "Next 30 days",
      value: counts.month,
      trend: 2,
      icon: CalendarClock,
      bucket: "month",
    },
  ];
}
