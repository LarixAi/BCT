import type { Trip, Vehicle } from "@/types/yard";
import { RegPlate, StatusChip } from "@/components/yard/primitives";
import { MapPin, Clock } from "lucide-react";

export function VehicleIdentityHeader({
  vehicle,
  trip,
  compact = false,
  className = "",
}: {
  vehicle: Vehicle;
  trip?: Trip | null;
  compact?: boolean;
  className?: string;
}) {
  const isVor = vehicle.status === "VOR";

  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {compact ? (
          <RegPlate reg={vehicle.reg} tone={isVor ? "vor" : "default"} className="text-sm" />
        ) : (
          <>
            <div
              className={`grid size-14 place-items-center rounded-xs border font-mono text-lg font-bold shrink-0 ${
                isVor ? "bg-vor/5 border-vor/20 text-vor" : "bg-secondary border-border"
              }`}
            >
              {vehicle.bayId}
            </div>
            <div className="min-w-0">
              <RegPlate reg={vehicle.reg} tone={isVor ? "vor" : "default"} className="text-base" />
              <div className="mt-1 text-xs text-muted font-medium uppercase tracking-wider">
                {vehicle.type}
                <span className="text-muted/60 mx-1">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="size-3" />
                  Bay {vehicle.bayId}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <StatusChip status={vehicle.status} />
        {trip && (
          <div className="text-[10px] text-muted text-right max-w-[180px]">
            <span className="font-bold uppercase tracking-widest text-foreground">{trip.code}</span>
            <span className="mx-1">·</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="size-3" />
              {trip.departAt}
            </span>
          </div>
        )}
        {compact && (
          <div className="text-[10px] text-muted font-mono">{vehicle.bayId}</div>
        )}
      </div>
    </div>
  );
}
