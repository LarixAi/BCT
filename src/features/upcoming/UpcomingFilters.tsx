import type { UpcomingCategory } from "@/types/upcoming";
import { UPCOMING_CATEGORY_LABELS } from "@/types/upcoming";
import type { Vehicle } from "@/types/yard";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";

export function UpcomingFilters({
  vehicles,
  category,
  vehicleId,
  yardTeamOnly,
  onCategoryChange,
  onVehicleChange,
  onYardTeamOnlyChange,
}: {
  vehicles: Vehicle[];
  category: UpcomingCategory | "all";
  vehicleId: string | "all";
  yardTeamOnly: boolean;
  onCategoryChange: (value: UpcomingCategory | "all") => void;
  onVehicleChange: (value: string | "all") => void;
  onYardTeamOnlyChange: (value: boolean) => void;
}) {
  return (
    <DashboardSurface className="!py-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Filters</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-[#667085]">Task type</span>
          <select
            value={category}
            onChange={e => onCategoryChange(e.target.value as UpcomingCategory | "all")}
            className="h-9 w-full rounded-lg border border-[#e4e7ec] bg-white px-2 text-sm text-ink"
          >
            <option value="all">All types</option>
            {Object.entries(UPCOMING_CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-medium text-[#667085]">Vehicle</span>
          <select
            value={vehicleId}
            onChange={e => onVehicleChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#e4e7ec] bg-white px-2 text-sm text-ink"
          >
            <option value="all">All vehicles</option>
            {vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.reg}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            checked={yardTeamOnly}
            onChange={e => onYardTeamOnlyChange(e.target.checked)}
            className="size-4 rounded border-[#d0d5dd]"
          />
          <span className="pb-1 font-medium text-[#344054]">Yard team can complete</span>
        </label>
      </div>
    </DashboardSurface>
  );
}
