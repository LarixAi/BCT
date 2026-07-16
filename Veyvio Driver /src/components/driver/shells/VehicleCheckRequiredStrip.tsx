import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useDriverStore } from "@/store/driver";
import { statusStripClass } from "@/domain/home/clean-home-view";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { cn } from "@/lib/utils";

/**
 * Persist across hubs, focused pages, and in-trip chrome until the walkaround is cleared.
 * Links to Checks so the driver can finish the required action.
 */
export function VehicleCheckRequiredStrip() {
  const summary = useDriverStore((s) => s.homeSummary);
  if (!shouldShowVehicleCheckRequiredStrip(summary)) return null;

  return (
    <Link
      to="/checks"
      className={cn(
        "flex w-full items-center justify-between gap-3 px-5 text-left text-white",
        "min-h-[3.5rem] pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]",
        statusStripClass("warn"),
        "z-40 shrink-0",
      )}
      aria-label="Vehicle check required — open Checks"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="size-2.5 shrink-0 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.2)]" />
        <span className="truncate text-sm font-bold tracking-tight">Vehicle check required</span>
      </span>
      <ChevronRight className="size-7 shrink-0 opacity-90" strokeWidth={1.5} />
    </Link>
  );
}
