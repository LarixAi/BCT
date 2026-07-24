import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useYard } from "@/store/yard";
import { useSessionStore } from "@/platform/auth/session-store";
import { getAttentionItems } from "@/features/yard/yard-map";
import { pendingDamageReviews } from "@/domain/condition/condition-helpers";
import { ordersAwaitingVerification } from "@/domain/condition/repair-workflow";
import { stagingSorted } from "@/domain/yard/operational-plan";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { yardCopy } from "@/copy/yard-messages";
import { DepotReadinessCanvasChart } from "@/features/home/DepotReadinessCanvasChart";
import {
  buildDepotReadinessSeries,
  departureReadinessSnapshot,
} from "@/features/home/depot-readiness-series";
import { HomeDashboardHeader } from "@/features/home/HomeDashboardHeader";
import { KpiMetricCard } from "@/features/home/HomeDashboardPrimitives";
import { buildHomeKpis } from "@/features/home/home-kpi";
import { RecentTasksTable } from "@/features/home/RecentTasksTable";
import { ShiftOverviewPanel } from "@/features/home/ShiftOverviewPanel";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { taskStats } from "@/domain/tasks/task-stats";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: yardPageTitle("Depot board") },
      { name: "description", content: "Live depot picture: KPIs, readiness chart, shift overview and tasks." },
    ],
  }),
  component: Home,
});

type Range = "daily" | "weekly" | "monthly" | "yearly";

function Home() {
  const [range, setRange] = useState<Range>("monthly");
  const vehicles = useYard(s => s.vehicles);
  const trips = useYard(s => s.trips);
  const tasks = useYard(s => s.tasks) ?? [];
  const operationalPlan = useYard(s => s.operationalPlan);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const damageObservations = useYard(s => s.damageObservations);
  const damageReviews = useYard(s => s.damageReviews);
  const userId = useSessionStore(s => s.user?.id);

  const upcomingTrips = trips.slice(0, 6);
  const nextTrip = upcomingTrips[0];
  const nextTripVehicle = nextTrip ? vehicles.find(v => v.id === nextTrip.vehicleId) : undefined;

  const damageReviewCount = useMemo(
    () => pendingDamageReviews(damageObservations, damageReviews).length,
    [damageObservations, damageReviews],
  );
  const repairVerifyCount = useMemo(
    () => ordersAwaitingVerification(repairOrders).length,
    [repairOrders],
  );
  const attention = useMemo(
    () => getAttentionItems(vehicles, trips, tasks, damageReviewCount, repairVerifyCount),
    [vehicles, trips, tasks, damageReviewCount, repairVerifyCount],
  );
  const recentTasks = useMemo(
    () => tasks.filter(t => t.status !== "cancelled").slice(0, 8),
    [tasks],
  );
  const readinessSeries = useMemo(() => buildDepotReadinessSeries(vehicles), [vehicles]);
  const departureReady = useMemo(() => departureReadinessSnapshot(trips), [trips]);
  const stats = useMemo(() => taskStats(tasks, userId), [tasks, userId]);
  const kpis = useMemo(() => buildHomeKpis({ vehicles, trips, tasks }), [vehicles, trips, tasks]);

  const departureProgress = trips.length
    ? Math.round((departureReady.ready / trips.length) * 100)
    : 0;

  const stagingPreview = useMemo(() => stagingSorted(operationalPlan).slice(0, 2), [operationalPlan]);
  const timeline = useMemo(() => {
    if (stagingPreview.length > 0) {
      return stagingPreview.map((item, index) => ({
        id: item.vehicleId,
        date: item.departAt,
        title: `Stage ${item.vehicleReg}${item.targetBayId ? ` to ${item.targetBayId}` : ""}`,
        done: index === 0,
        to: "/plan" as const,
      }));
    }
    return upcomingTrips.slice(0, 2).map((trip, index) => ({
      id: trip.id,
      date: trip.departAt,
      title: `${trip.code} · ${trip.service}`,
      done: trip.ready,
      to: "/departure-line" as const,
    }));
  }, [stagingPreview, upcomingTrips]);

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      <HomeDashboardHeader range={range} onRangeChange={setRange} />

      <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-5">
        {kpis.map(kpi => (
          <div key={kpi.id} className="w-[min(82vw,300px)] shrink-0 snap-start sm:w-auto sm:min-w-0">
            <KpiMetricCard
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              icon={kpi.icon}
              to={kpi.to}
            />
          </div>
        ))}
      </section>

      {attention.length > 0 && (
        <DashboardSurface>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">{yardCopy.home.needsAttention}</h2>
            <span className="text-xs text-[#667085]">{attention.length} actions</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {attention.map(item => (
              <Link
                key={item.id}
                to={item.to}
                params={item.params}
                className="flex items-center justify-between rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs text-[#667085]">{item.detail}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" />
              </Link>
            ))}
          </div>
        </DashboardSurface>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <DashboardSurface className="!p-3 sm:!p-5">
          <DepotReadinessCanvasChart series={readinessSeries} />
        </DashboardSurface>

        <ShiftOverviewPanel
          nextTrip={nextTrip}
          nextTripVehicle={nextTripVehicle}
          departureProgress={departureProgress}
          operationalPlan={operationalPlan}
          timeline={timeline}
          openTaskCount={stats.open}
        />
      </div>

      <RecentTasksTable tasks={recentTasks} />
    </div>
  );
}
