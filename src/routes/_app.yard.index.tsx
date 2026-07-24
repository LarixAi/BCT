import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useYard } from "@/store/yard";
import { VehicleCard, VehicleInventoryRow } from "@/components/yard/primitives";
import type { BayZone, VehicleStatus } from "@/types/yard";
import { computeReadiness } from "@/lib/readiness";
import { ArrowUpDown, Map as MapIcon, Search, SlidersHorizontal, Truck } from "lucide-react";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubMetricCard, HubMetricStrip } from "@/features/hub/HubMetricCard";
import { HubPageHeader, HubSecondaryButton, hubPageShellClass } from "@/features/hub/HubPageHeader";

export const Route = createFileRoute("/_app/yard/")({
  head: () => ({
    meta: [
      { title: "Yard Inventory — Veyvio Yard" },
      { name: "description", content: "Every vehicle on the depot, filterable by bay zone and operational status." },
    ],
  }),
  component: YardList,
});

const ZONES: (BayZone | "All")[] = ["All", "Parking", "Departure Line", "Wash", "Fuel", "Inspection", "Workshop", "Off-site"];
type QuickFilter = "all" | "attention" | "vor" | "check-due";

const ATTENTION_STATUSES = new Set<VehicleStatus>(["VOR", "Awaiting Check", "In Workshop"]);

function YardList() {
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const equipment = useYard(s => s.equipment);
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<BayZone | "All">("All");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [equipmentIncomplete, setEquipmentIncomplete] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const bayZoneMap = useMemo(() => new Map(bays.map(b => [b.id, b.zone])), [bays]);
  const bayZone = (id: string): BayZone => bayZoneMap.get(id) ?? "Parking";

  const quickCounts = useMemo(() => ({
    all: vehicles.length,
    attention: vehicles.filter(v => ATTENTION_STATUSES.has(v.status)).length,
    vor: vehicles.filter(v => v.status === "VOR").length,
    "check-due": vehicles.filter(v => v.status === "Awaiting Check").length,
  }), [vehicles]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return vehicles
      .filter(v => {
        if (normalizedQuery && !`${v.reg} ${v.bayId} ${v.type} ${v.status}`.toLowerCase().includes(normalizedQuery)) return false;
        if (zone !== "All" && (bayZoneMap.get(v.bayId) ?? "Parking") !== zone) return false;
        if (quickFilter === "attention" && !ATTENTION_STATUSES.has(v.status)) return false;
        if (quickFilter === "vor" && v.status !== "VOR") return false;
        if (quickFilter === "check-due" && v.status !== "Awaiting Check") return false;
        if (equipmentIncomplete && computeReadiness(v, equipment[v.id]).state === "ready") return false;
        return true;
      })
      .sort((a, b) => a.bayId.localeCompare(b.bayId, undefined, { numeric: true }) || a.reg.localeCompare(b.reg));
  }, [vehicles, query, zone, quickFilter, equipmentIncomplete, equipment, bayZoneMap]);

  const activeFilterCount = (quickFilter === "all" ? 0 : 1) + (zone === "All" ? 0 : 1) + (equipmentIncomplete ? 1 : 0);

  function clearFilters() {
    setQuery("");
    setQuickFilter("all");
    setZone("All");
    setEquipmentIncomplete(false);
  }

  return (
    <div className={hubPageShellClass}>
      <HubPageHeader
        title="Vehicles"
        description={`${vehicles.length} records across ${new Set(bays.map(b => b.zone)).size} yard zones.`}
        primaryAction={
          <Link to="/yard/map" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto">
            <MapIcon className="size-4" />
            Yard map
          </Link>
        }
      />

      <HubMetricStrip>
        <HubMetricCard label="All vehicles" value={quickCounts.all} icon={Truck} active={quickFilter === "all"} onClick={() => setQuickFilter("all")} />
        <HubMetricCard label="Needs action" value={quickCounts.attention} icon={SlidersHorizontal} tone="warn" active={quickFilter === "attention"} onClick={() => setQuickFilter("attention")} />
        <HubMetricCard label="VOR" value={quickCounts.vor} icon={Truck} tone="vor" active={quickFilter === "vor"} onClick={() => setQuickFilter("vor")} />
        <HubMetricCard label="Check due" value={quickCounts["check-due"]} icon={Search} tone="warn" active={quickFilter === "check-due"} onClick={() => setQuickFilter("check-due")} />
      </HubMetricStrip>

      <DashboardSurface className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search registration or bay"
              className="h-10 w-full rounded-full border border-[#e4e7ec] bg-[#f9fafb] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#d0d5dd] focus:bg-white focus:ring-2 focus:ring-ink/10"
            />
            <span className="sr-only">Search registration or bay</span>
          </label>
          <HubSecondaryButton
            type="button"
            onClick={() => setFiltersOpen(open => !open)}
            className={filtersOpen || activeFilterCount > 0 ? "border-[#d0d5dd] bg-[#f2f4f7]" : ""}
          >
            <SlidersHorizontal className="size-4" />
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </HubSecondaryButton>
        </div>

        {filtersOpen && (
          <div className="space-y-4 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">Filter vehicles</h2>
                <p className="mt-0.5 text-xs text-[#667085]">Find records that need action now.</p>
              </div>
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-ink">Clear</button>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#667085]">Yard zone</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {ZONES.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setZone(option)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${zone === option ? "border-ink bg-ink text-white" : "border-[#e4e7ec] bg-white text-[#667085]"}`}
                  >
                    {option === "All" ? "All zones" : option}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#eaecf0] bg-white p-3">
              <span>
                <span className="block text-sm font-medium text-ink">Equipment incomplete</span>
                <span className="mt-0.5 block text-xs text-[#667085]">Only show vehicles with readiness gaps</span>
              </span>
              <input type="checkbox" checked={equipmentIncomplete} onChange={e => setEquipmentIncomplete(e.target.checked)} className="size-4 accent-ink" />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs text-[#667085]">
          <span>Showing {filtered.length} of {vehicles.length}</span>
          <span className="inline-flex items-center gap-1"><ArrowUpDown className="size-3" />Bay order</span>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
          {filtered.map(v => <VehicleCard key={v.id} v={v} zone={bayZone(v.bayId)} />)}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[#e4e7ec] bg-[#fcfcfd] p-8 text-center">
              <p className="text-sm font-semibold text-ink">No vehicles match these filters</p>
              <button type="button" onClick={clearFilters} className="mt-2 text-sm font-medium text-ink underline">Clear filters</button>
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-[#eaecf0] lg:block">
          <div className="grid grid-cols-[72px_130px_minmax(120px,1fr)_170px_76px_minmax(130px,1fr)_24px] gap-3 bg-[#f9fafb] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
            <span>Bay</span><span>Registration</span><span>Vehicle</span><span>Status</span><span>Fuel</span><span>Equipment</span><span aria-hidden />
          </div>
          {filtered.map(v => <VehicleInventoryRow key={v.id} v={v} zone={bayZone(v.bayId)} />)}
          {filtered.length === 0 && <div className="p-10 text-center text-sm text-[#667085]">No vehicles match</div>}
        </div>
      </DashboardSurface>
    </div>
  );
}
