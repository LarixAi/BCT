import { Link } from "@tanstack/react-router";
import { Camera, ChevronRight } from "lucide-react";
import { RegPlate } from "@/components/yard/primitives";
import {
  formatFleetNumber,
  formatLastInspectionLabel,
  type VehicleBodyworkSummary,
  vehicleInServiceLabel,
} from "@/domain/vehicle-bodywork/fleet-helpers";
import { statusPillTone } from "@/domain/yard/status-display";
import { StatusPill } from "@/features/home/HomeDashboardPrimitives";
import type { Vehicle } from "@/types/yard";

interface VehicleBodyworkCardProps {
  vehicle: Vehicle;
  summary: VehicleBodyworkSummary;
  depotName?: string | null;
}

export function VehicleBodyworkCard({ vehicle, summary, depotName }: VehicleBodyworkCardProps) {
  const hasDamage = summary.openDamageCount > 0 || summary.knownDamageAreas > 0;

  return (
    <article className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4 transition-colors hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />
            <StatusPill
              label={vehicleInServiceLabel(vehicle.status)}
              tone={statusPillTone(vehicle.status)}
            />
          </div>
          <p className="mt-2 text-sm text-ink">
            {vehicle.type}
            <span className="mx-1.5 text-[#d0d5dd]">·</span>
            Fleet {formatFleetNumber(vehicle.id)}
          </p>
          <p className="mt-1 text-sm text-[#667085]">
            {depotName ?? "Depot"}
            <span className="mx-1.5 text-[#d0d5dd]">·</span>
            Bay {vehicle.bayId}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {hasDamage ? (
          <>
            <p className="text-sm font-medium text-ink">
              {summary.knownDamageAreas} known damage area{summary.knownDamageAreas === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-[#667085]">
              {summary.openReportCount} open report{summary.openReportCount === 1 ? "" : "s"}
              <span className="mx-1.5 text-[#d0d5dd]">·</span>
              {formatLastInspectionLabel(summary.lastBodyInspectionAt)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">No known bodywork damage</p>
            <p className="mt-1 text-sm text-[#667085]">
              {formatLastInspectionLabel(summary.lastBodyInspectionAt)}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/vehicle-bodywork/$vehicleId"
          params={{ vehicleId: vehicle.id }}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm sm:flex-none"
        >
          View bodywork
          <ChevronRight className="size-4 text-[#98a2b3]" aria-hidden />
        </Link>
        <Link
          to="/vehicle-bodywork/$vehicleId/report"
          params={{ vehicleId: vehicle.id }}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:flex-none"
        >
          <Camera className="size-4" aria-hidden />
          Report damage
        </Link>
      </div>
    </article>
  );
}
