import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TripsHeader } from "@/components/driver/trips/TripsHeader";
import { TripsTabBar } from "@/components/driver/trips/TripsTabBar";
import { TripsTodayTab } from "@/components/driver/trips/TripsTodayTab";
import { TripsUpcomingTab } from "@/components/driver/trips/TripsUpcomingTab";
import { TripsCompletedTab } from "@/components/driver/trips/TripsCompletedTab";
import {
  buildActiveTripsSchedule,
  buildEmptyTripsSchedule,
  buildExceptionTripsSchedule,
} from "@/data/mocks/trips-schedule";
import { useDriverStore } from "@/store/driver";
import { useDriverPreferencesStore } from "@/store/driver-preferences";
import type { TripsPageState, TripsTab } from "@/types/trips";
import { resolveDemoParam } from "@/platform/dev/dev-guards";

type TripsDemo = "normal" | "active" | "exception" | "empty";

export const Route = createFileRoute("/_app/trips/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: (search.demo as TripsDemo | undefined) ?? "normal",
  }),
  head: () => ({ meta: [{ title: "Trips — Veyvio Driver" }] }),
  component: TripsPage,
});

function TripsPage() {
  const { demo: rawDemo } = Route.useSearch();
  const demo = resolveDemoParam(rawDemo) ?? "normal";
  const storeSchedule = useDriverStore((s) => s.tripsSchedule);
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const [activeTab, setActiveTab] = useState<TripsTab>("today");
  const [completedFilter, setCompletedFilter] = useState<TripsPageState["completedFilter"]>("7d");
  const tripsTodayFilter = useDriverPreferencesStore((s) => s.tripsTodayFilter);
  const setTripsTodayFilter = useDriverPreferencesStore((s) => s.setTripsTodayFilter);

  const tripsSchedule = useMemo(() => {
    if (demo === "active") return buildActiveTripsSchedule();
    if (demo === "exception") return buildExceptionTripsSchedule();
    if (demo === "empty") return buildEmptyTripsSchedule();
    return storeSchedule;
  }, [demo, storeSchedule]);

  return (
    <div className="animate-in-up space-y-4">
      <TripsHeader summary={homeSummary} />
      <TripsTabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === "today" && (
        <TripsTodayTab
          alerts={tripsSchedule.operationalAlerts}
          assignments={tripsSchedule.today}
          filter={tripsTodayFilter}
          onFilterChange={setTripsTodayFilter}
        />
      )}
      {activeTab === "upcoming" && <TripsUpcomingTab grouped={tripsSchedule.upcoming} />}
      {activeTab === "completed" && (
        <TripsCompletedTab
          grouped={tripsSchedule.completed}
          filter={completedFilter}
          onFilterChange={setCompletedFilter}
        />
      )}
    </div>
  );
}
