import { useMemo } from "react";
import { dayKey, startOfWeek, weekDays } from "@/features/tasks/task-board-utils";
import { upcomingItemDayKey } from "@/domain/upcoming/upcoming-item-links";
import type { UpcomingItem } from "@/types/upcoming";
import type { UpcomingCalendarRange } from "./UpcomingDashboardHeader";

export function startOfMonth(date = new Date()): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function monthGridDays(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  const gridStart = new Date(start);
  const weekday = gridStart.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  gridStart.setDate(gridStart.getDate() + mondayOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function groupUpcomingByDay(items: UpcomingItem[], now = new Date()): Map<string, UpcomingItem[]> {
  const map = new Map<string, UpcomingItem[]>();
  for (const item of items) {
    const key = upcomingItemDayKey(item, now);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function calendarVisibleDays(range: UpcomingCalendarRange, anchor: Date): Date[] {
  if (range === "week") return weekDays(startOfWeek(anchor));
  return monthGridDays(anchor);
}

export function useUpcomingCalendar(items: UpcomingItem[], range: UpcomingCalendarRange, anchor: Date) {
  return useMemo(() => {
    const days = calendarVisibleDays(range, anchor);
    const byDay = groupUpcomingByDay(items);
    const todayKey = dayKey(new Date());
    return { days, byDay, todayKey };
  }, [items, range, anchor]);
}

export function priorityPillClass(priority: UpcomingItem["priority"], selected: boolean): string {
  if (selected) return "bg-ink text-white";
  switch (priority) {
    case "critical":
      return "border border-[#fecdca] bg-[#fef3f2] text-[#b42318]";
    case "urgent":
      return "border border-[#fedf89] bg-[#fff6ed] text-[#c4320a]";
    case "upcoming":
      return "border border-[#d9d6fe] bg-[#f4f3ff] text-[#5925dc]";
    default:
      return "border border-[#e4e7ec] bg-[#f9fafb] text-[#344054]";
  }
}
