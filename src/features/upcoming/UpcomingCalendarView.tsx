import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { dayKey } from "@/features/tasks/task-board-utils";
import { formatUpcomingDue, getUpcomingItemLink, upcomingItemDayKey } from "@/domain/upcoming/upcoming-item-links";
import type { UpcomingItem } from "@/types/upcoming";
import type { UpcomingCalendarRange } from "./UpcomingDashboardHeader";
import { priorityPillClass, useUpcomingCalendar } from "./upcoming-calendar";
import { UPCOMING_CATEGORY_LABELS } from "@/types/upcoming";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  items: UpcomingItem[];
  range: UpcomingCalendarRange;
  anchor: Date;
  selectedDay: string;
  onSelectDay: (dayKey: string) => void;
  onAnchorChange: (anchor: Date) => void;
};

export function UpcomingCalendarView({
  items,
  range,
  anchor,
  selectedDay,
  onSelectDay,
  onAnchorChange,
}: Props) {
  const { days, byDay, todayKey } = useUpcomingCalendar(items, range, anchor);
  const monthLabel = anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  function shiftAnchor(delta: number) {
    const next = new Date(anchor);
    if (range === "week") next.setDate(next.getDate() + delta * 7);
    else next.setMonth(next.getMonth() + delta);
    onAnchorChange(next);
  }

  return (
    <DashboardSurface className="!p-3 sm:!p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Upcoming calendar</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftAnchor(-1)}
            className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] text-[#98a2b3]"
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[140px] text-center text-xs font-medium text-[#667085]">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftAnchor(1)}
            className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] text-[#98a2b3]"
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {range === "month" ? (
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[#98a2b3]">
          {WEEKDAY_LABELS.map(label => (
            <div key={label}>{label}</div>
          ))}
        </div>
      ) : null}

      <div
        className={`mt-3 grid gap-2 ${range === "month" ? "grid-cols-7" : "min-w-[640px] grid-cols-7 overflow-x-auto"}`}
      >
        {days.map(day => {
          const key = dayKey(day);
          const dayItems = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;
          const inMonth = range === "week" || day.getMonth() === anchor.getMonth();

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              className={`min-h-[88px] rounded-xl border p-2 text-left transition-colors sm:min-h-[104px] ${
                isSelected
                  ? "border-ink bg-ink text-white"
                  : isToday
                    ? "border-[#12a89d] bg-[#f0fdf9]"
                    : "border-[#eaecf0] bg-[#fcfcfd] hover:bg-white"
              } ${range === "month" && !inMonth ? "opacity-40" : ""}`}
            >
              <div
                className={`text-xs font-semibold tabular-nums ${
                  isSelected ? "text-white" : isToday ? "text-[#027a48]" : "text-[#667085]"
                }`}
              >
                {day.toLocaleDateString("en-GB", { day: "numeric", month: range === "week" ? "short" : undefined })}
              </div>
              <div className="mt-1.5 space-y-1">
                {dayItems.slice(0, 2).map(item => (
                  <span
                    key={item.id}
                    className={`block truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px] ${
                      isSelected ? "bg-white/15 text-white" : priorityPillClass(item.priority, false)
                    }`}
                    title={item.title}
                  >
                    {item.vehicleReg ?? item.title}
                  </span>
                ))}
                {dayItems.length > 2 ? (
                  <span className={`text-[9px] font-medium ${isSelected ? "text-white/80" : "text-[#98a2b3]"}`}>
                    +{dayItems.length - 2} more
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </DashboardSurface>
  );
}

export function UpcomingDayPanel({
  items,
  selectedDay,
}: {
  items: UpcomingItem[];
  selectedDay: string;
}) {
  const dayItems = items.filter(item => upcomingItemDayKey(item) === selectedDay);

  const label = new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Day detail</h2>
          <p className="mt-0.5 text-xs text-[#667085]">{label}</p>
        </div>
        <span className="rounded-md bg-[#f2f4f7] px-1.5 py-0.5 text-[11px] font-semibold text-[#475467]">
          {dayItems.length}
        </span>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {dayItems.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[#e4e7ec] px-3 py-6 text-center text-xs text-[#98a2b3]">
            Nothing scheduled for this day.
          </li>
        ) : (
          dayItems.map(item => {
            const link = getUpcomingItemLink(item);
            return (
              <li
                key={item.id}
                className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                  {UPCOMING_CATEGORY_LABELS[item.category]}
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-xs text-[#667085]">{formatUpcomingDue(item.dueAt)}</p>
                {link ? (
                  <Link
                    to={link.to}
                    params={link.params}
                    className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-widest text-[#12a89d]"
                  >
                    {link.label}
                  </Link>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
