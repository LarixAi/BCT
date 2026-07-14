import { useMemo } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { useSessionStore } from "@/platform/auth/session-store";
import { kpiCounts } from "@/domain/yard/kpi";
import { pickBoardTasks } from "@/domain/tasks/task-automation";
import { formatTaskDue } from "@/domain/tasks/task-stats";
import { drivers } from "@/data/fixtures";
import { KpiCard, SectionHeader, DepartureRow, VehicleCard, EmptyState } from "@/components/yard/primitives";
import { getAttentionItems, zoneOccupancyStats } from "@/features/yard/yard-map";
import { pendingDamageReviews } from "@/domain/condition/condition-helpers";
import { ordersAwaitingVerification } from "@/domain/condition/repair-workflow";
import { Map, LogIn, ScanLine, ListTodo, ChevronRight, AlertTriangle } from "lucide-react";
import {
  countVehiclesNeedingAttention,
  homeOperationalHeadline,
  homeSubtitle,
  yardCopy,
} from "@/copy/yard-messages";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Home Board — Veyvio Yard" },
      { name: "description", content: "Live depot picture: KPIs, departure line and yard inventory." },
    ],
  }),
  component: Home,
});

function Home() {
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const trips = useYard(s => s.trips);
  const tasks = useYard(s => s.tasks) ?? [];
  const repairOrders = useYard(s => s.repairWorkOrders);
  const damageObservations = useYard(s => s.damageObservations);
  const damageReviews = useYard(s => s.damageReviews);
  const userId = useSessionStore(s => s.user?.id);
  const c = kpiCounts(vehicles);
  const preview = vehicles.slice(0, 4);
  const driverName = (id?: string) => drivers.find(d => d.id === id)?.name;

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
  const zoneStats = useMemo(() => zoneOccupancyStats(bays, vehicles).filter(s => s.total > 0), [bays, vehicles]);
  const boardTasks = useMemo(() => pickBoardTasks(tasks, userId, 3), [tasks, userId]);
  const vehiclesNeedingAttention = useMemo(
    () => countVehiclesNeedingAttention(vehicles, trips),
    [vehicles, trips],
  );
  const depotActionCount = attention.length;

  return (
    <div className="space-y-6">
      <header className="animate-in-up">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{yardCopy.home.boardLabel}</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight mt-0.5">
          {homeOperationalHeadline(vehiclesNeedingAttention)}
        </h1>
        <p className="text-sm text-muted mt-1">{homeSubtitle(vehiclesNeedingAttention, depotActionCount)}</p>
      </header>

      {attention.length > 0 && (
        <section className="space-y-2 animate-in-up">
          <SectionHeader title={yardCopy.home.needsAttention} />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
            {attention.map(item => (
              <Link
                key={item.id}
                to={item.to}
                params={item.params}
                className={`snap-start shrink-0 min-w-[min(100%,200px)] min-h-[76px] p-3.5 rounded-sm border bg-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between ${
                  item.tone === "vor" ? "border-vor/30 border-l-4 border-l-vor"
                  : item.tone === "warn" ? "border-warn/40 border-l-4 border-l-warn"
                  : item.tone === "primary" ? "border-primary/30 border-l-4 border-l-primary"
                  : "border-border"
                }`}
              >
                <div>
                  <div className={`text-sm font-display font-extrabold ${
                    item.tone === "vor" ? "text-vor"
                    : item.tone === "warn" ? "text-warn"
                    : item.tone === "primary" ? "text-primary"
                    : "text-foreground"
                  }`}>{item.label}</div>
                  <div className="text-xs text-muted mt-1 leading-snug">{item.detail}</div>
                </div>
                <ChevronRight className="size-4 text-muted mt-2 self-end" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {attention.length === 0 && (
        <div className="animate-in-up">
          <EmptyState
            icon={<AlertTriangle className="size-8 mx-auto" />}
            title={yardCopy.home.allClearTitle}
            hint={yardCopy.home.allClearHint}
          />
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 animate-in-up">
        <KpiCard label="Available" value={c.available} to="/yard" />
        <KpiCard label="VOR" value={c.vor.toString().padStart(2, "0")} tone="vor" to="/vor" />
        <KpiCard label="Awaiting" value={c.awaiting.toString().padStart(2, "0")} tone="warn" to="/checks" />
        <KpiCard label="On Line" value={c.onLine.toString().padStart(2, "0")} tone="primary" to="/departure-line" />
        <KpiCard label="Workshop" value={c.workshop.toString().padStart(2, "0")} to="/yard" />
      </section>

      <section className="grid grid-cols-3 gap-2 animate-in-up" style={{ animationDelay: "40ms" }}>
        <QuickLink to="/yard/map" icon={<Map className="size-4" />} label="Yard map" />
        <QuickLink to="/arrivals" icon={<LogIn className="size-4" />} label="Arrivals" />
        <QuickLink to="/scan" icon={<ScanLine className="size-4" />} label="Scan" />
      </section>

      {boardTasks.length > 0 && (
        <section className="space-y-2 animate-in-up" style={{ animationDelay: "50ms" }}>
          <SectionHeader
            title="My tasks"
            action={<Link to="/tasks" className="text-[10px] font-bold uppercase tracking-widest text-primary">All tasks →</Link>}
          />
          <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
            {boardTasks.map(task => (
              <Link
                key={task.id}
                to="/tasks/$taskId"
                params={{ taskId: task.id }}
                className="flex items-center gap-3 p-3 hover:bg-secondary/50"
              >
                <ListTodo className="size-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{task.title}</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {task.status.replace("_", " ")} · due {formatTaskDue(task.dueAt)}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2 animate-in-up" style={{ animationDelay: "60ms" }}>
        <SectionHeader title="Zone occupancy" action={<Link to="/yard/map" className="text-[10px] font-bold uppercase tracking-widest text-primary">Map →</Link>} />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {zoneStats.map(s => (
            <div key={s.zone} className="shrink-0 bg-white border border-border rounded-xs px-3 py-2 min-w-[100px]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted truncate">{s.zone}</div>
              <div className="text-lg font-display font-extrabold tabular-nums">{s.occupied}<span className="text-muted text-xs font-medium">/{s.total}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 animate-in-up" style={{ animationDelay: "80ms" }}>
        <SectionHeader
          title="Departure Line"
          sub="next 90 min"
          action={<Link to="/departure-line" className="text-[10px] font-bold uppercase tracking-widest text-primary">View all →</Link>}
        />
        <div className="bg-white border border-border rounded-xs overflow-hidden">
          {trips.slice(0, 6).map(t => (
            <DepartureRow key={t.id} trip={t} vehicle={vehicles.find(v => v.id === t.vehicleId)} driverName={driverName(t.driverId)} />
          ))}
        </div>
      </section>

      <section className="space-y-3 animate-in-up" style={{ animationDelay: "160ms" }}>
        <SectionHeader
          title="Yard Inventory"
          action={<Link to="/yard" className="text-[10px] font-bold uppercase tracking-widest text-primary">View all {vehicles.length} →</Link>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preview.map(v => <VehicleCard key={v.id} v={v} nextAction={nextActionFor(v.status)} />)}
        </div>
      </section>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 min-h-[72px] bg-white border border-border rounded-sm p-3 shadow-sm hover:border-primary/40 hover:shadow-md active:scale-[0.98] transition-all">
      <span className="text-primary">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}

function nextActionFor(status: string): string {
  switch (status) {
    case "Awaiting Check": return "Yard check";
    case "VOR": return "Mechanic inspection";
    case "On Departure Line": return "Awaiting driver";
    case "In Workshop": return "Awaiting parts";
    case "Off-site": return "Return to depot";
    default: return "Standing by";
  }
}
