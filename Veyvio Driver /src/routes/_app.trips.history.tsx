import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { TripsCompletedTab } from "@/components/driver/trips/TripsCompletedTab";
import { buildMockTripsSchedule } from "@/data/mocks/trips-schedule";
import type { TripsPageState } from "@/types/trips";

export const Route = createFileRoute("/_app/trips/history")({
  head: () => ({ meta: [{ title: "Trip history — Veyvio Driver" }] }),
  component: TripHistoryPage,
});

function TripHistoryPage() {
  const [completedFilter, setCompletedFilter] =
    useState<TripsPageState["completedFilter"]>("7d");

  const grouped = useMemo(() => buildMockTripsSchedule().completed, []);

  return (
    <div className="animate-in-up space-y-4 pb-6" data-testid="trips-history-page">
      <header className="space-y-2">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Trips
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Trip history</h1>
        <p className="text-sm text-muted">Completed assignments and journey records.</p>
      </header>

      <TripsCompletedTab
        grouped={grouped}
        filter={completedFilter}
        onFilterChange={setCompletedFilter}
      />
    </div>
  );
}
