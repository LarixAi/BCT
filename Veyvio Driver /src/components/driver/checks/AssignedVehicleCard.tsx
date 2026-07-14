import type { VehicleChecksHome } from "@/types/vehicle-check";
import { HomeCard, HomeCardLabel, HomeCardTitle, HomeDetailRow } from "@/components/driver/home/HomeCard";
import { CheckStatusBadge } from "./CheckStatusBadge";
import { Bus } from "lucide-react";

export function AssignedVehicleCard({ home }: { home: VehicleChecksHome }) {
  const { vehicle, dutyLabel, dutyReference } = home;

  return (
    <HomeCard>
      <HomeCardLabel>Assigned vehicle</HomeCardLabel>

      <div className="mt-2 flex gap-3">
        <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-secondary text-muted">
          <Bus className="size-8" aria-hidden />
        </div>
        <div className="min-w-0">
          <HomeCardTitle>
            <span className="font-mono">{vehicle.registration}</span>
          </HomeCardTitle>
          <p className="text-sm text-muted">
            Fleet {vehicle.fleetNumber} · {vehicle.vehicleType}
          </p>
          <p className="text-xs text-muted">{vehicle.depotName}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2">
        <HomeDetailRow label="Duty" value={`${dutyLabel} (${dutyReference})`} />
        <HomeDetailRow label="Mileage" value={vehicle.mileage.toLocaleString()} />
        <HomeDetailRow label="Fuel / charge" value={vehicle.fuelOrChargeLevel} />
        {vehicle.accessibilityCapable && (
          <HomeDetailRow label="Accessibility" value="Wheelchair accessible" />
        )}
        {vehicle.lastCompletedCheck && (
          <HomeDetailRow
            label="Last check"
            value={`${vehicle.lastCompletedCheck.completedAt} · ${vehicle.lastCompletedCheck.reference}`}
          />
        )}
      </dl>

      <div className="mt-4">
        <CheckStatusBadge status={vehicle.gateStatus} />
      </div>

      {vehicle.vorRestrictions && vehicle.vorRestrictions.length > 0 && (
        <div className="mt-3 rounded-md border border-vor/30 bg-vor/5 p-3 text-sm text-vor">
          {vehicle.vorRestrictions.map((r) => (
            <p key={r}>{r}</p>
          ))}
        </div>
      )}
    </HomeCard>
  );
}
