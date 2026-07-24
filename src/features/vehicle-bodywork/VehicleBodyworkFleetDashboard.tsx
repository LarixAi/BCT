import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Camera, Search, SlidersHorizontal, Truck } from "lucide-react";
import { EmptyState } from "@/components/yard/primitives";
import {
  fleetBodyworkMetrics,
  matchesVehicleSearch,
  summarizeVehicleBodywork,
  type FleetDamageFilter,
  type FleetSummaryFilter,
  vehicleMatchesDamageFilter,
  vehicleMatchesSummaryFilter,
} from "@/domain/vehicle-bodywork/fleet-helpers";
import { VehicleBodyworkCard } from "@/features/vehicle-bodywork/VehicleBodyworkCard";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubMetricCard, HubMetricStrip } from "@/features/hub/HubMetricCard";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useYard } from "@/store/yard";
import type { DamageSeverity } from "@/types/condition";
import type { VehicleType as YardVehicleType } from "@/types/yard";

const DAMAGE_FILTERS: { value: FleetDamageFilter; label: string }[] = [
  { value: "all", label: "All vehicles" },
  { value: "damage_recorded", label: "Damage recorded" },
  { value: "no_damage", label: "No known damage" },
  { value: "new_reported", label: "New damage reported" },
  { value: "awaiting_assessment", label: "Awaiting assessment" },
  { value: "repair_required", label: "Repair required" },
  { value: "repair_booked", label: "Repair booked" },
  { value: "repair_in_progress", label: "Repair in progress" },
  { value: "repair_completed", label: "Repair completed" },
  { value: "vor", label: "Vehicle off road" },
];

const SEVERITY_FILTERS: { value: DamageSeverity | "all"; label: string }[] = [
  { value: "all", label: "Any severity" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "operational", label: "Moderate" },
  { value: "safety_critical", label: "Serious" },
];

const VEHICLE_TYPES: YardVehicleType[] = ["Minibus", "Low-floor", "Coach", "WAV"];

export function VehicleBodyworkFleetDashboard() {
  const vehicles = useYard(s => s.vehicles);
  const damageRecords = useYard(s => s.damageRecords);
  const inspections = useYard(s => s.inspections);
  const depotName = useTenancyStore(s => s.depotName);

  const [query, setQuery] = useState("");
  const [damageFilter, setDamageFilter] = useState<FleetDamageFilter>("all");
  const [summaryFilter, setSummaryFilter] = useState<FleetSummaryFilter | null>(null);
  const [vehicleType, setVehicleType] = useState<YardVehicleType | "all">("all");
  const [severity, setSeverity] = useState<DamageSeverity | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const metrics = useMemo(
    () => fleetBodyworkMetrics(vehicles, damageRecords),
    [vehicles, damageRecords],
  );

  const summaries = useMemo(
    () => new Map(vehicles.map(v => [v.id, summarizeVehicleBodywork(v.id, damageRecords, inspections)])),
    [vehicles, damageRecords, inspections],
  );

  const filtered = useMemo(() => {
    return vehicles
      .filter(vehicle => {
        const summary = summaries.get(vehicle.id)!;
        if (!matchesVehicleSearch(vehicle, query, depotName)) return false;
        if (summaryFilter && !vehicleMatchesSummaryFilter(summary, vehicle, summaryFilter)) return false;
        if (!vehicleMatchesDamageFilter(summary, vehicle, damageRecords, damageFilter)) return false;
        if (vehicleType !== "all" && vehicle.type !== vehicleType) return false;
        if (severity !== "all") {
          const open = damageRecords.filter(
            d => d.vehicleId === vehicle.id && d.severity === severity,
          );
          if (open.length === 0) return false;
        }
        return true;
      })
      .sort((a, b) => a.reg.localeCompare(b.reg));
  }, [
    vehicles,
    summaries,
    query,
    depotName,
    summaryFilter,
    damageFilter,
    vehicleType,
    severity,
    damageRecords,
  ]);

  const activeFilterCount =
    (damageFilter === "all" ? 0 : 1)
    + (vehicleType === "all" ? 0 : 1)
    + (severity === "all" ? 0 : 1)
    + (summaryFilter ? 1 : 0);

  function selectSummaryFilter(next: FleetSummaryFilter) {
    setSummaryFilter(current => (current === next ? null : next));
    setDamageFilter("all");
  }

  function clearFilters() {
    setQuery("");
    setDamageFilter("all");
    setSummaryFilter(null);
    setVehicleType("all");
    setSeverity("all");
  }

  return (
    <div className={hubPageShellClass}>
      <HubPageHeader
        title="Vehicle Bodywork"
        description="View, report and manage bodywork damage across your fleet."
        primaryAction={
          <Link
            to="/vehicle-bodywork/report"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
          >
            <Camera className="size-4" aria-hidden />
            Report new damage
          </Link>
        }
      />

      <HubMetricStrip>
        <HubMetricCard
          label="Vehicles with damage"
          value={metrics.vehiclesWithDamage}
          icon={Truck}
          tone="warn"
          active={summaryFilter === "vehicles_with_damage"}
          onClick={() => selectSummaryFilter("vehicles_with_damage")}
        />
        <HubMetricCard
          label="Open damage reports"
          value={metrics.openReports}
          icon={SlidersHorizontal}
          tone="warn"
          active={summaryFilter === "open_reports"}
          onClick={() => selectSummaryFilter("open_reports")}
        />
        <HubMetricCard
          label="Awaiting assessment"
          value={metrics.awaitingAssessment}
          icon={Search}
          tone="warn"
          active={summaryFilter === "awaiting_assessment"}
          onClick={() => selectSummaryFilter("awaiting_assessment")}
        />
        <HubMetricCard
          label="Repairs in progress"
          value={metrics.repairsInProgress}
          icon={Truck}
          tone="progress"
          active={summaryFilter === "repairs_in_progress"}
          onClick={() => selectSummaryFilter("repairs_in_progress")}
        />
      </HubMetricStrip>

      <DashboardSurface className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search registration, fleet number, make or bay"
              className="h-10 w-full rounded-full border border-[#e4e7ec] bg-[#f9fafb] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#d0d5dd] focus:bg-white focus:ring-2 focus:ring-ink/10"
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(open => !open)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink"
          >
            <SlidersHorizontal className="size-4 text-[#667085]" aria-hidden />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {filtersOpen ? (
          <div className="grid gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-[#667085]">
              Damage status
              <select
                value={damageFilter}
                onChange={event => {
                  setDamageFilter(event.target.value as FleetDamageFilter);
                  setSummaryFilter(null);
                }}
                className="mt-1 h-10 w-full rounded-lg border border-[#e4e7ec] bg-white px-3 text-sm text-ink"
              >
                {DAMAGE_FILTERS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#667085]">
              Vehicle type
              <select
                value={vehicleType}
                onChange={event => setVehicleType(event.target.value as YardVehicleType | "all")}
                className="mt-1 h-10 w-full rounded-lg border border-[#e4e7ec] bg-white px-3 text-sm text-ink"
              >
                <option value="all">All types</option>
                {VEHICLE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#667085]">
              Damage severity
              <select
                value={severity}
                onChange={event => setSeverity(event.target.value as DamageSeverity | "all")}
                className="mt-1 h-10 w-full rounded-lg border border-[#e4e7ec] bg-white px-3 text-sm text-ink"
              >
                {SEVERITY_FILTERS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-left text-sm font-medium text-primary sm:col-span-3"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : null}
      </DashboardSurface>

      <DashboardSurface>
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Fleet vehicles · {filtered.length}
        </h2>

        {vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles are available for this depot"
            description="Check your depot permissions or ask an administrator to assign vehicles."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No vehicles match the selected filters"
            description="Try clearing filters or searching with a different registration."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(vehicle => (
              <VehicleBodyworkCard
                key={vehicle.id}
                vehicle={vehicle}
                summary={summaries.get(vehicle.id)!}
                depotName={depotName}
              />
            ))}
          </div>
        )}
      </DashboardSurface>
    </div>
  );
}
