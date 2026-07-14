import { gateStatusLabel, gateStatusTone, toneClasses } from "@/domain/vehicle-check/check-helpers";
import type { VehicleChecksHome } from "@/types/vehicle-check";
import { cn } from "@/lib/utils";

export function CheckStatusBadge({ status }: { status: VehicleChecksHome["vehicle"]["gateStatus"] }) {
  const tone = gateStatusTone(status);
  const classes = toneClasses(tone);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", classes.badge)}>
      <span className={cn("size-2 rounded-full", classes.dot)} aria-hidden />
      {gateStatusLabel(status)}
    </span>
  );
}
