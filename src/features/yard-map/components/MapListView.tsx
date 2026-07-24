import { Link } from "@tanstack/react-router";
import type { SpatialBayState } from "@/features/yard-map/resolve-layout";
import type { VehicleStatus } from "@/types/yard";
import { RegPlate } from "@/components/yard/primitives";
import { STATUS_BAY_TONE } from "@/features/yard/yard-map";

interface MapListViewProps {
  states: SpatialBayState[];
  query: string;
}

export function MapListView({ states, query }: MapListViewProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = states.filter(s => {
    if (!normalized) return true;
    const hay = `${s.bayNumber} ${s.displayName} ${s.vehicle?.reg ?? "empty"} ${s.vehicle?.status ?? ""}`.toLowerCase();
    return hay.includes(normalized);
  });

  return (
    <div className="space-y-2" role="list" aria-label="Yard bays list view">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {filtered.length} of {states.length} bays
      </p>
      {filtered.map(state => (
        <BayListRow key={state.layoutBayId} state={state} />
      ))}
      {filtered.length === 0 && (
        <p className="rounded border border-dashed border-border p-6 text-center text-sm text-muted">
          No bays match your search
        </p>
      )}
    </div>
  );
}

function BayListRow({ state }: { state: SpatialBayState }) {
  const { vehicle, displayName, operationalStatus } = state;

  if (!vehicle) {
    return (
      <div
        role="listitem"
        className="flex items-center justify-between rounded border border-dashed border-border bg-secondary/30 px-3 py-2.5"
      >
        <div>
          <p className="text-sm font-bold">{displayName}</p>
          <p className="text-xs capitalize text-muted">{operationalStatus.replace(/_/g, " ")}</p>
        </div>
        <span className="text-xs font-bold text-muted">Empty</span>
      </div>
    );
  }

  const tone = STATUS_BAY_TONE[vehicle.status as VehicleStatus];
  return (
    <Link
      to="/yard/$vehicleId"
      params={{ vehicleId: vehicle.id }}
      role="listitem"
      className={`flex items-center justify-between rounded border px-3 py-2.5 transition-opacity hover:opacity-90 ${tone}`}
    >
      <div>
        <p className="text-sm font-bold">{displayName}</p>
        <p className="text-xs uppercase">{vehicle.status === "Available" ? "READY" : vehicle.status}</p>
      </div>
      <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="text-[10px]" />
    </Link>
  );
}
