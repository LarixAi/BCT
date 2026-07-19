import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useYard } from "@/store/yard";
import { VehicleCard, VehicleInventoryRow } from "@/components/yard/primitives";
import type { BayZone, VehicleStatus } from "@/types/yard";
import { computeReadiness } from "@/lib/readiness";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";

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
        if (
          normalizedQuery &&
          !`${v.reg} ${v.bayId} ${v.type} ${v.status}`.toLowerCase().includes(normalizedQuery)
        ) return false;
        if (zone !== "All" && (bayZoneMap.get(v.bayId) ?? "Parking") !== zone) return false;
        if (quickFilter === "attention" && !ATTENTION_STATUSES.has(v.status)) return false;
        if (quickFilter === "vor" && v.status !== "VOR") return false;
        if (quickFilter === "check-due" && v.status !== "Awaiting Check") return false;
        if (equipmentIncomplete && computeReadiness(v, equipment[v.id]).state === "ready") return false;
        return true;
      })
      .sort((a, b) => a.bayId.localeCompare(b.bayId, undefined, { numeric: true }) || a.reg.localeCompare(b.reg));
  }, [vehicles, query, zone, quickFilter, equipmentIncomplete, equipment, bayZoneMap]);

  const activeFilterCount =
    (quickFilter === "all" ? 0 : 1) +
    (zone === "All" ? 0 : 1) +
    (equipmentIncomplete ? 1 : 0);

  function clearFilters() {
    setQuery("");
    setQuickFilter("all");
    setZone("All");
    setEquipmentIncomplete(false);
  }

  return (
    <div className="space-y-4 animate-in-up">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">Vehicles</h1>
          <p className="mt-0.5 text-xs text-muted">{vehicles.length} records · {new Set(bays.map(b => b.zone)).size} yard zones</p>
        </div>
        <Link to="/yard/map" className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary">
          Yard map →
        </Link>
      </header>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search registration or bay"
            className="h-10 w-full rounded border border-input bg-white pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span className="sr-only">Search registration or bay</span>
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          aria-expanded={filtersOpen}
          className={`inline-flex h-10 items-center gap-2 rounded border px-3 text-xs font-bold transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-white hover:border-primary/50"
          }`}
        >
          <SlidersHorizontal className="size-4 text-primary" aria-hidden />
          Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <QuickFilterChip label="All" count={quickCounts.all} active={quickFilter === "all"} onClick={() => setQuickFilter("all")} />
        <QuickFilterChip label="Needs action" count={quickCounts.attention} active={quickFilter === "attention"} onClick={() => setQuickFilter("attention")} />
        <QuickFilterChip label="VOR" count={quickCounts.vor} active={quickFilter === "vor"} onClick={() => setQuickFilter("vor")} />
        <QuickFilterChip label="Check due" count={quickCounts["check-due"]} active={quickFilter === "check-due"} onClick={() => setQuickFilter("check-due")} />
      </div>

      {filtersOpen && (
        <section className="rounded border border-border bg-white p-3 sm:p-4" aria-label="Vehicle filters">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-extrabold">Filter vehicles</h2>
              <p className="mt-0.5 text-[10px] text-muted">Find the records that need action now.</p>
            </div>
            <button type="button" onClick={clearFilters} className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Clear
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Operational status</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <QuickFilterChip label="Needs attention" count={quickCounts.attention} active={quickFilter === "attention"} onClick={() => setQuickFilter("attention")} panel />
              <QuickFilterChip label="VOR" count={quickCounts.vor} active={quickFilter === "vor"} onClick={() => setQuickFilter("vor")} panel />
              <QuickFilterChip label="Awaiting check" count={quickCounts["check-due"]} active={quickFilter === "check-due"} onClick={() => setQuickFilter("check-due")} panel />
              <QuickFilterChip label="All statuses" count={quickCounts.all} active={quickFilter === "all"} onClick={() => setQuickFilter("all")} panel />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Yard zone</h3>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {ZONES.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setZone(option)}
                  aria-pressed={zone === option}
                  className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${
                    zone === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-muted hover:border-primary/50"
                  }`}
                >
                  {option === "All" ? "All zones" : option}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded border border-border p-3">
            <span>
              <span className="block text-xs font-bold">Equipment incomplete</span>
              <span className="mt-0.5 block text-[10px] text-muted">Only show vehicles with readiness gaps</span>
            </span>
            <input
              type="checkbox"
              checked={equipmentIncomplete}
              onChange={event => setEquipmentIncomplete(event.target.checked)}
              className="size-4 accent-primary"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="mt-4 h-10 w-full rounded bg-accent text-xs font-bold uppercase tracking-widest text-white"
          >
            Show {filtered.length} {filtered.length === 1 ? "vehicle" : "vehicles"}
          </button>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 text-[10px] text-muted">
        <span className="font-bold uppercase tracking-widest">Showing {filtered.length} of {vehicles.length}</span>
        <span className="inline-flex items-center gap-1">
          <ArrowUpDown className="size-3" aria-hidden />
          Bay order
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
        {filtered.map(v => <VehicleCard key={v.id} v={v} zone={bayZone(v.bayId)} />)}
        {filtered.length === 0 && (
          <div className="col-span-full rounded border border-dashed border-border bg-white p-8 text-center">
            <p className="text-sm font-bold">No vehicles match these filters</p>
            <button type="button" onClick={clearFilters} className="mt-2 text-xs font-bold text-primary">Clear filters</button>
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-white lg:block">
        <div className="grid grid-cols-[72px_130px_minmax(120px,1fr)_170px_76px_minmax(130px,1fr)_24px] gap-3 bg-secondary/60 px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted">
          <span>Bay</span>
          <span>Registration</span>
          <span>Vehicle</span>
          <span>Status</span>
          <span>Fuel</span>
          <span>Equipment</span>
          <span aria-hidden />
        </div>
        {filtered.map(v => (
          <VehicleInventoryRow key={v.id} v={v} zone={bayZone(v.bayId)} />
        ))}
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm font-bold uppercase tracking-widest text-muted">
            No vehicles match
          </div>
        )}
      </div>
    </div>
  );
}

function QuickFilterChip({
  label,
  count,
  active,
  onClick,
  panel = false,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  panel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${panel ? "flex w-full items-center justify-between rounded px-2.5 py-2" : "shrink-0 rounded-full px-2.5 py-1.5"} border text-[10px] font-bold transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-white text-muted hover:border-primary/50"
      }`}
    >
      <span>{label}</span>
      <span className={panel ? "ml-2" : "ml-1"}>{count}</span>
    </button>
  );
}
