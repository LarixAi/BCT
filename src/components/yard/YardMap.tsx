import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useYard } from "@/store/yard";
import {
  buildBayOccupancy,
  groupBaysByZone,
  STATUS_BAY_TONE,
  zoneOccupancyStats,
  type BayOccupancy,
} from "@/features/yard/yard-map";
import type { BayZone } from "@/types/yard";
import { RegPlate } from "@/components/yard/primitives";
import { Search, SlidersHorizontal } from "lucide-react";

const ZONES: (BayZone | "All")[] = [
  "All",
  "Parking",
  "Departure Line",
  "Wash",
  "Fuel",
  "Inspection",
  "Workshop",
  "Off-site",
];

type BayStateFilter = "all" | "available" | "attention" | "vor" | "empty";

export function YardMap() {
  const bays = useYard(s => s.bays);
  const vehicles = useYard(s => s.vehicles);
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<BayZone | "All">("All");
  const [stateFilter, setStateFilter] = useState<BayStateFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const occupancy = useMemo(() => buildBayOccupancy(bays, vehicles), [bays, vehicles]);
  const grouped = useMemo(() => groupBaysByZone(bays), [bays]);
  const stats = useMemo(() => zoneOccupancyStats(bays, vehicles), [bays, vehicles]);

  const stateCounts = useMemo(() => ({
    all: occupancy.length,
    available: occupancy.filter(cell => cell.vehicle?.status === "Available").length,
    attention: occupancy.filter(cell =>
      cell.vehicle?.status === "Awaiting Check" || cell.vehicle?.status === "In Workshop"
    ).length,
    vor: occupancy.filter(cell => cell.vehicle?.status === "VOR").length,
    empty: occupancy.filter(cell => !cell.vehicle).length,
  }), [occupancy]);

  const filteredByZone = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...grouped.entries()]
      .filter(([zone, zoneBays]) => zoneBays.length > 0 && (zoneFilter === "All" || zone === zoneFilter))
      .map(([zone]) => {
        const cells = occupancy.filter(cell => {
          if (cell.bay.zone !== zone) return false;
          if (
            normalizedQuery &&
            !`${cell.bay.id} ${cell.vehicle?.reg ?? ""} ${cell.vehicle?.status ?? "empty"}`
              .toLowerCase()
              .includes(normalizedQuery)
          ) return false;
          if (stateFilter === "available" && cell.vehicle?.status !== "Available") return false;
          if (
            stateFilter === "attention" &&
            cell.vehicle?.status !== "Awaiting Check" &&
            cell.vehicle?.status !== "In Workshop"
          ) return false;
          if (stateFilter === "vor" && cell.vehicle?.status !== "VOR") return false;
          if (stateFilter === "empty" && cell.vehicle) return false;
          return true;
        });
        return [zone, cells] as const;
      })
      .filter(([, cells]) => cells.length > 0);
  }, [grouped, occupancy, query, zoneFilter, stateFilter]);

  const resultCount = filteredByZone.reduce((total, [, cells]) => total + cells.length, 0);
  const activeFilterCount = (zoneFilter === "All" ? 0 : 1) + (stateFilter === "all" ? 0 : 1);

  function clearFilters() {
    setQuery("");
    setZoneFilter("All");
    setStateFilter("all");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search bay or registration"
            className="h-10 w-full rounded border border-input bg-white pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span className="sr-only">Search bay or registration</span>
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
        <StateFilterChip label="All bays" count={stateCounts.all} active={stateFilter === "all"} onClick={() => setStateFilter("all")} />
        <StateFilterChip label="Available" count={stateCounts.available} active={stateFilter === "available"} onClick={() => setStateFilter("available")} />
        <StateFilterChip label="Attention" count={stateCounts.attention} active={stateFilter === "attention"} onClick={() => setStateFilter("attention")} />
        <StateFilterChip label="VOR" count={stateCounts.vor} active={stateFilter === "vor"} onClick={() => setStateFilter("vor")} />
        <StateFilterChip label="Empty" count={stateCounts.empty} active={stateFilter === "empty"} onClick={() => setStateFilter("empty")} />
      </div>

      {filtersOpen && (
        <section className="rounded border border-border bg-white p-3 sm:p-4" aria-label="Yard map filters">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-extrabold">Filter yard map</h2>
              <p className="mt-0.5 text-[10px] text-muted">Focus on bays and vehicles needing action.</p>
            </div>
            <button type="button" onClick={clearFilters} className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Clear
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Bay state</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <StateFilterChip label="All bays" count={stateCounts.all} active={stateFilter === "all"} onClick={() => setStateFilter("all")} panel />
              <StateFilterChip label="Available" count={stateCounts.available} active={stateFilter === "available"} onClick={() => setStateFilter("available")} panel />
              <StateFilterChip label="Attention" count={stateCounts.attention} active={stateFilter === "attention"} onClick={() => setStateFilter("attention")} panel />
              <StateFilterChip label="VOR" count={stateCounts.vor} active={stateFilter === "vor"} onClick={() => setStateFilter("vor")} panel />
              <StateFilterChip label="Empty bays" count={stateCounts.empty} active={stateFilter === "empty"} onClick={() => setStateFilter("empty")} panel />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Yard zone</h3>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {ZONES.map(zone => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setZoneFilter(zone)}
                  aria-pressed={zoneFilter === zone}
                  className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold ${
                    zoneFilter === zone
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-muted hover:border-primary/50"
                  }`}
                >
                  {zone === "All" ? "All zones" : zone}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="mt-4 h-10 w-full rounded bg-accent text-xs font-bold uppercase tracking-widest text-white"
          >
            Show {resultCount} {resultCount === 1 ? "bay" : "bays"}
          </button>
        </section>
      )}

      {zoneFilter === "All" && !query && stateFilter === "all" && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {stats.filter(stat => stat.total > 0).map(stat => (
            <button
              key={stat.zone}
              type="button"
              onClick={() => setZoneFilter(stat.zone)}
              className="min-w-[116px] shrink-0 rounded border border-border bg-white p-2.5 text-left transition-colors hover:border-primary"
            >
              <div className="truncate text-[9px] font-bold uppercase tracking-widest text-muted">{stat.zone}</div>
              <div className="mt-1 font-display text-lg font-extrabold tabular-nums">
                {stat.occupied}<span className="text-sm font-medium text-muted">/{stat.total}</span>
              </div>
              <div className="text-[9px] text-muted">{stat.empty} empty</div>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-[10px] text-muted">
        <span className="font-bold uppercase tracking-widest">Showing {resultCount} of {bays.length} bays</span>
        <span>{filteredByZone.length} {filteredByZone.length === 1 ? "zone" : "zones"}</span>
      </div>

      {filteredByZone.map(([zone, cells]) => (
        <section key={zone} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground">{zone}</h3>
            <span className="text-[10px] tabular-nums text-muted">
              {cells.filter(cell => cell.vehicle).length}/{cells.length} shown occupied
            </span>
          </div>
          <div className={`grid gap-2 ${gridColsForZone(zone)}`}>
            {cells.map(cell => (
              <BayCell key={cell.bay.id} cell={cell} />
            ))}
          </div>
        </section>
      ))}

      {filteredByZone.length === 0 && (
        <div className="rounded border border-dashed border-border bg-white p-8 text-center">
          <p className="text-sm font-bold">No bays match these filters</p>
          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-bold text-primary">Clear filters</button>
        </div>
      )}
    </div>
  );
}

function gridColsForZone(zone: BayZone): string {
  if (zone === "Parking") return "grid-cols-2 sm:grid-cols-4 xl:grid-cols-6";
  if (zone === "Departure Line") return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

function BayCell({ cell }: { cell: BayOccupancy }) {
  const { bay, vehicle } = cell;

  if (!vehicle) {
    return (
      <div className="flex min-h-[72px] flex-col justify-between rounded border border-dashed border-border border-l-[3px] border-l-muted/50 bg-secondary/30 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] font-bold text-muted">{bay.id}</span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted">Available bay</span>
        </div>
        <span className="text-xs font-bold text-muted">Empty</span>
      </div>
    );
  }

  const tone = STATUS_BAY_TONE[vehicle.status];
  return (
    <Link
      to="/yard/$vehicleId"
      params={{ vehicleId: vehicle.id }}
      className={`flex min-h-[72px] flex-col justify-between rounded border border-l-[3px] p-2.5 transition-opacity hover:opacity-90 ${tone}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] font-bold">{bay.id}</span>
        <span className="text-right text-[8px] font-bold uppercase leading-tight tracking-wider">{vehicle.status}</span>
      </div>
      <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="w-fit px-1 py-0 text-[10px]" />
    </Link>
  );
}

function StateFilterChip({
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
