import { formatFuelPct } from "@/lib/format-fuel-pct";
import { Link } from "@tanstack/react-router";
import type { SpatialBayState } from "@/features/yard-map/resolve-layout";
import type { Trip } from "@/types/yard";
import { RegPlate } from "@/components/yard/primitives";
import { STATUS_BAY_TONE } from "@/features/yard/yard-map";
import { useYard } from "@/store/yard";
import { X } from "lucide-react";

interface VehicleDetailDrawerProps {
  state: SpatialBayState;
  nextTrip?: Trip | null;
  onClose: () => void;
}

export function VehicleDetailDrawer({ state, nextTrip, onClose }: VehicleDetailDrawerProps) {
  const { vehicle, displayName } = state;
  const openSheet = useYard(s => s.openSheet);
  if (!vehicle) return null;

  const tone = STATUS_BAY_TONE[vehicle.status];

  return (
    <div className="rounded-t-xl border border-border bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />
          <p className="mt-2 text-xs text-muted">{vehicle.type} · {displayName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:text-foreground">
          <X className="size-5" />
        </button>
      </div>

      <div className={`mt-3 rounded border p-3 ${tone}`}>
        <p className="text-xs font-bold uppercase tracking-wide">{vehicle.status === "Available" ? "READY" : vehicle.status}</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted">Fuel</dt>
            <dd className="font-bold tabular-nums">{formatFuelPct(vehicle.fuelPct)}</dd>
          </div>
          <div>
            <dt className="text-muted">Next duty</dt>
            <dd className="font-bold">{nextTrip ? `${nextTrip.departAt} · ${nextTrip.code}` : "—"}</dd>
          </div>
        </dl>
        {vehicle.notes && <p className="mt-2 text-xs">{vehicle.notes}</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/yard/$vehicleId"
          params={{ vehicleId: vehicle.id }}
          className="flex h-10 items-center justify-center rounded bg-primary text-xs font-bold text-white"
        >
          View vehicle
        </Link>
        <button
          type="button"
          className="h-10 rounded border border-border text-xs font-bold"
          onClick={() => {
            onClose();
            openSheet({ kind: "move", vehicleId: vehicle.id });
          }}
        >
          Move vehicle
        </button>
      </div>
    </div>
  );
}
