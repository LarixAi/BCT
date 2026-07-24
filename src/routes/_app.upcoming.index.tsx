import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { buildUpcomingFeed, filterUpcomingFeed } from "@/domain/upcoming/build-upcoming-feed";
import { dayKey } from "@/features/tasks/task-board-utils";
import { UpcomingAttentionPanel } from "@/features/upcoming/UpcomingAttentionPanel";
import { UpcomingCalendarView, UpcomingDayPanel } from "@/features/upcoming/UpcomingCalendarView";
import {
  UpcomingDashboardHeader,
  type UpcomingCalendarRange,
  type UpcomingViewMode,
} from "@/features/upcoming/UpcomingDashboardHeader";
import { UpcomingFilters } from "@/features/upcoming/UpcomingFilters";
import { UpcomingKpiCard } from "@/features/upcoming/UpcomingKpiCard";
import { UpcomingListPanel } from "@/features/upcoming/UpcomingListPanel";
import { buildUpcomingKpis } from "@/features/upcoming/upcoming-kpi";
import { useYard } from "@/store/yard";
import type { UpcomingBucket, UpcomingCategory } from "@/types/upcoming";

export const Route = createFileRoute("/_app/upcoming/")({
  head: () => ({
    meta: [
      { title: "Upcoming — Veyvio Yard" },
      {
        name: "description",
        content: "Forward-planning for inspections, maintenance, safety tasks and preventative yard work.",
      },
    ],
  }),
  component: UpcomingPage,
});

function UpcomingPage() {
  const tasks = useYard(s => s.tasks) ?? [];
  const vehicles = useYard(s => s.vehicles) ?? [];
  const defects = useYard(s => s.defects) ?? [];
  const movements = useYard(s => s.movements) ?? [];

  const [view, setView] = useState<UpcomingViewMode>("calendar");
  const [calendarRange, setCalendarRange] = useState<UpcomingCalendarRange>("month");
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [bucket, setBucket] = useState<UpcomingBucket | "all">("all");
  const [category, setCategory] = useState<UpcomingCategory | "all">("all");
  const [vehicleId, setVehicleId] = useState<string | "all">("all");
  const [yardTeamOnly, setYardTeamOnly] = useState(false);

  const allItems = useMemo(
    () => buildUpcomingFeed({ tasks, vehicles, defects, movements }),
    [tasks, vehicles, defects, movements],
  );

  const kpis = useMemo(() => buildUpcomingKpis(allItems), [allItems]);

  const filteredItems = useMemo(
    () =>
      filterUpcomingFeed(allItems, {
        bucket,
        category,
        vehicleId,
        yardTeamOnly,
      }),
    [allItems, bucket, category, vehicleId, yardTeamOnly],
  );

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      <UpcomingDashboardHeader
        view={view}
        onViewChange={setView}
        calendarRange={calendarRange}
        onCalendarRangeChange={setCalendarRange}
      />

      <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
        {kpis.map(kpi => (
          <div key={kpi.id} className="w-[min(82vw,300px)] shrink-0 snap-start sm:w-auto sm:min-w-0">
            <UpcomingKpiCard
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              icon={kpi.icon}
              active={bucket === kpi.bucket}
              onClick={() => setBucket(bucket === kpi.bucket ? "all" : kpi.bucket)}
            />
          </div>
        ))}
      </section>

      <UpcomingAttentionPanel items={allItems} />

      <UpcomingFilters
        vehicles={vehicles}
        category={category}
        vehicleId={vehicleId}
        yardTeamOnly={yardTeamOnly}
        onCategoryChange={setCategory}
        onVehicleChange={setVehicleId}
        onYardTeamOnlyChange={setYardTeamOnly}
      />

      {view === "calendar" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <UpcomingCalendarView
            items={filteredItems}
            range={calendarRange}
            anchor={calendarAnchor}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onAnchorChange={setCalendarAnchor}
          />
          <UpcomingDayPanel items={filteredItems} selectedDay={selectedDay} />
        </div>
      ) : (
        <UpcomingListPanel items={filteredItems} />
      )}
    </div>
  );
}
