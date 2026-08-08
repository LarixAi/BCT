import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { buildUpcomingFeed, filterUpcomingFeed } from "@/domain/upcoming/build-upcoming-feed";
import type { ComplianceDueItem } from "@/domain/upcoming/map-compliance-due-items";
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
import {
  commandFetchComplianceExpiring,
  type CommandComplianceExpiryItem,
} from "@/platform/auth/command-auth-api";
import { getSessionSnapshot } from "@/platform/auth/session-store";
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

function normalizeComplianceItem(row: CommandComplianceExpiryItem): ComplianceDueItem {
  return {
    id: row.id,
    entityType: row.entityType ?? row.entity_type ?? "vehicle",
    entityId: String(row.entityId ?? row.entity_id ?? ""),
    entityLabel: row.entityLabel ?? row.entity_label ?? null,
    documentType: String(row.documentType ?? row.document_type ?? ""),
    expiryDate: String(row.expiryDate ?? row.expiry_date ?? ""),
    source: row.source,
  };
}

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
  const [complianceDueItems, setComplianceDueItems] = useState<ComplianceDueItem[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    async function loadCompliance() {
      const token = getSessionSnapshot().accessToken;
      if (!token || token.startsWith("mock_")) {
        if (!cancelled) {
          setComplianceDueItems([]);
          setComplianceStatus("unavailable");
        }
        return;
      }
      try {
        const rows = await commandFetchComplianceExpiring(token, 60);
        if (cancelled) return;
        setComplianceDueItems(rows.map(normalizeComplianceItem).filter(r => r.entityId && r.expiryDate));
        setComplianceStatus("ready");
      } catch {
        if (cancelled) return;
        setComplianceDueItems([]);
        setComplianceStatus("unavailable");
      }
    }
    void loadCompliance();
    return () => {
      cancelled = true;
    };
  }, []);

  const allItems = useMemo(
    () =>
      buildUpcomingFeed({
        tasks,
        vehicles,
        defects,
        movements,
        complianceDueItems,
      }),
    [tasks, vehicles, defects, movements, complianceDueItems],
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

  const vehicleComplianceCount = complianceDueItems.filter(i => i.entityType === "vehicle").length;

  return (
    <div className="space-y-4 pb-2 sm:space-y-6 sm:pb-4">
      <UpcomingDashboardHeader
        view={view}
        onViewChange={setView}
        calendarRange={calendarRange}
        onCalendarRangeChange={setCalendarRange}
      />

      {complianceStatus === "unavailable" ? (
        <div className="rounded-xs border border-border bg-white px-4 py-3 text-sm text-muted">
          <p className="font-semibold text-foreground">Compliance schedule unavailable/not configured</p>
          <p className="mt-1">
            MOT, retorque, and other compliance due dates appear here when Command provides an authoritative due-item feed.
            Synthetic compliance rows are never invented.
          </p>
        </div>
      ) : complianceStatus === "ready" && vehicleComplianceCount === 0 ? (
        <div className="rounded-xs border border-border bg-white px-4 py-3 text-sm text-muted">
          <p className="font-semibold text-foreground">No compliance due items in the next 60 days</p>
          <p className="mt-1">Command returned no MOT or wheel re-torque dates for this company.</p>
        </div>
      ) : complianceStatus === "loading" ? (
        <div className="rounded-xs border border-border bg-white px-4 py-3 text-sm text-muted">
          Loading compliance due items from Command…
        </div>
      ) : null}

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
