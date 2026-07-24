import { formatFuelPct } from "@/lib/format-fuel-pct";
import { Link } from "@tanstack/react-router";
import type { SpatialBayState } from "@/features/yard-map/resolve-layout";
import { RegPlate } from "@/components/yard/primitives";
import { STATUS_BAY_TONE } from "@/features/yard/yard-map";
import { X } from "lucide-react";

interface BayDetailDrawerProps {
  state: SpatialBayState;
  onClose: () => void;
}

export function BayDetailDrawer({ state, onClose }: BayDetailDrawerProps) {
  const { vehicle, operationalStatus, isLifo, isReserved, displayName } = state;

  return (
    <div className="rounded-t-xl border border-border bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold">{displayName}</h2>
          <p className="mt-0.5 text-xs text-muted capitalize">
            Status: {operationalStatus.replace(/_/g, " ")}
            {isLifo ? " · LIFO" : ""}
            {isReserved ? " · Reserved" : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>

      {vehicle ? (
        <VehicleSummary vehicle={vehicle} />
      ) : (
        <div className="mt-4 rounded border border-dashed border-border bg-secondary/30 p-4 text-center">
          <p className="text-sm font-bold text-muted">Empty bay</p>
          <p className="mt-1 text-xs text-muted">Available for parking</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {!vehicle && (
          <button type="button" className="h-10 rounded border border-border text-xs font-bold" disabled>
            Reserve bay
          </button>
        )}
        {vehicle && (
          <Link
            to="/yard/$vehicleId"
            params={{ vehicleId: vehicle.id }}
            className="flex h-10 items-center justify-center rounded bg-primary text-xs font-bold text-white"
          >
            View vehicle
          </Link>
        )}
        <button type="button" className="h-10 rounded border border-border text-xs font-bold" disabled>
          {vehicle ? "Move vehicle" : "Assign vehicle"}
        </button>
      </div>
    </div>
  );
}

function VehicleSummary({ vehicle }: { vehicle: NonNullable<SpatialBayState["vehicle"]> }) {
  const tone = STATUS_BAY_TONE[vehicle.status];
  return (
    <div className={`mt-4 rounded border p-3 ${tone}`}>
      <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />
      <p className="mt-2 text-xs font-bold uppercase tracking-wide">{vehicle.status}</p>
      <p className="mt-1 text-xs text-muted">{vehicle.type} · Fuel {formatFuelPct(vehicle.fuelPct)}</p>
      {vehicle.notes && <p className="mt-2 text-xs">{vehicle.notes}</p>}
    </div>
  );
}
