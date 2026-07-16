import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useYard } from "@/store/yard";
import { VehicleCard, VehicleInventoryRow, SectionHeader } from "@/components/yard/primitives";
import type { BayZone, VehicleStatus } from "@/types/yard";

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
const STATUSES: (VehicleStatus | "All")[] = ["All", "Available", "Awaiting Check", "On Departure Line", "In Workshop", "VOR", "Off-site"];

function YardList() {
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const [zone, setZone] = useState<BayZone | "All">("All");
  const [status, setStatus] = useState<VehicleStatus | "All">("All");

  const bayZoneMap = useMemo(() => new Map(bays.map(b => [b.id, b.zone])), [bays]);
  const bayZone = (id: string): BayZone => bayZoneMap.get(id) ?? "Parking";

  const filtered = useMemo(() => vehicles.filter(v => {
    if (zone !== "All" && bayZone(v.bayId) !== zone) return false;
    if (status !== "All" && v.status !== status) return false;
    return true;
  }), [vehicles, zone, status, bayZoneMap]);

  return (
    <div className="space-y-4 animate-in-up">
      <SectionHeader
        title={`Vehicles · ${filtered.length}`}
        action={<Link to="/yard/map" className="text-[10px] font-bold uppercase tracking-widest text-primary">Yard map →</Link>}
      />

      <div className="space-y-2">
        <FilterBar label="Zone" value={zone} options={ZONES} onChange={setZone as (v: string) => void} />
        <FilterBar label="Status" value={status} options={STATUSES} onChange={setStatus as (v: string) => void} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {filtered.map(v => <VehicleCard key={v.id} v={v} />)}
        {filtered.length === 0 && (
          <div className="col-span-full border border-dashed border-border p-8 text-center rounded-xs bg-white">
            <p className="text-sm font-bold uppercase tracking-widest text-muted">No vehicles match</p>
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

function FilterBar({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted shrink-0 w-14">{label}</span>
      <div className="flex gap-1">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
              value === o
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-white hover:border-primary/50"
            }`}
          >{o}</button>
        ))}
      </div>
    </div>
  );
}
