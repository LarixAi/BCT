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

export function YardMap() {
  const bays = useYard(s => s.bays);
  const vehicles = useYard(s => s.vehicles);
  const [zoneFilter, setZoneFilter] = useState<BayZone | "All">("All");

  const occupancy = useMemo(() => buildBayOccupancy(bays, vehicles), [bays, vehicles]);
  const grouped = useMemo(() => groupBaysByZone(bays), [bays]);
  const stats = useMemo(() => zoneOccupancyStats(bays, vehicles), [bays, vehicles]);

  const visibleZones = zoneFilter === "All"
    ? [...grouped.entries()].filter(([, list]) => list.length > 0)
    : [[zoneFilter, grouped.get(zoneFilter) ?? []] as const];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ZONES.map(z => (
          <button
            key={z}
            type="button"
            onClick={() => setZoneFilter(z)}
            className={`shrink-0 px-3 py-1.5 rounded-xs border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              zoneFilter === z ? "border-primary bg-primary text-white" : "border-border bg-white text-muted hover:border-accent"
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      {zoneFilter === "All" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.filter(s => s.total > 0).map(s => (
            <button
              key={s.zone}
              type="button"
              onClick={() => setZoneFilter(s.zone)}
              className="bg-white border border-border rounded-xs p-2 text-left hover:border-accent transition-colors"
            >
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted truncate">{s.zone}</div>
              <div className="text-lg font-display font-extrabold tabular-nums">
                {s.occupied}<span className="text-muted text-sm font-medium">/{s.total}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {visibleZones.map(([zone, zoneBays]) => {
        const cells = occupancy.filter(o => o.bay.zone === zone);
        return (
          <section key={zone} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">{zone}</h3>
              <span className="text-[10px] text-muted tabular-nums">
                {cells.filter(c => c.vehicle).length}/{cells.length} occupied
              </span>
            </div>
            <div className={`grid gap-2 ${gridColsForZone(zone)}`}>
              {cells.map(cell => (
                <BayCell key={cell.bay.id} cell={cell} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function gridColsForZone(zone: BayZone): string {
  if (zone === "Parking") return "grid-cols-4 sm:grid-cols-8";
  if (zone === "Departure Line") return "grid-cols-3 sm:grid-cols-6";
  return "grid-cols-2 sm:grid-cols-4";
}

function BayCell({ cell }: { cell: BayOccupancy }) {
  const { bay, vehicle } = cell;

  if (!vehicle) {
    return (
      <div className="min-h-[52px] rounded-xs border border-dashed border-border bg-secondary/30 p-2 flex flex-col justify-between">
        <span className="font-mono text-[10px] font-bold text-muted">{bay.id}</span>
        <span className="text-[9px] uppercase tracking-widest text-muted/70">Empty</span>
      </div>
    );
  }

  const tone = STATUS_BAY_TONE[vehicle.status];
  return (
    <Link
      to="/yard/$vehicleId/equipment"
      params={{ vehicleId: vehicle.id }}
      className={`min-h-[52px] rounded-xs border p-2 flex flex-col justify-between hover:opacity-90 transition-opacity ${tone}`}
    >
      <span className="font-mono text-[10px] font-bold">{bay.id}</span>
      <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="text-[10px] px-1 py-0" />
    </Link>
  );
}
