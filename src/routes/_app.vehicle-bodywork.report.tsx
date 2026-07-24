import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { RegPlate } from "@/components/yard/primitives";
import { matchesVehicleSearch } from "@/domain/vehicle-bodywork/fleet-helpers";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/vehicle-bodywork/report")({
  head: () => ({
    meta: [{ title: yardPageTitle("Report bodywork damage") }],
  }),
  component: ReportDamageSelectVehiclePage,
});

function ReportDamageSelectVehiclePage() {
  const vehicles = useYard(s => s.vehicles);
  const depotName = useTenancyStore(s => s.depotName);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      vehicles
        .filter(v => matchesVehicleSearch(v, query, depotName))
        .sort((a, b) => a.reg.localeCompare(b.reg)),
    [vehicles, query, depotName],
  );

  return (
    <div className={hubPageShellClass}>
      <HubPageHeader
        title="Report new damage"
        description="Select the vehicle to inspect and record bodywork damage."
        showSync={false}
      />

      <DashboardSurface className="space-y-4">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search registration or fleet number"
            className="h-10 w-full rounded-full border border-[#e4e7ec] bg-[#f9fafb] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#d0d5dd] focus:bg-white focus:ring-2 focus:ring-ink/10"
          />
        </label>

        <div className="space-y-2">
          {filtered.map(vehicle => (
            <Link
              key={vehicle.id}
              to="/vehicle-bodywork/$vehicleId/report"
              params={{ vehicleId: vehicle.id }}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
            >
              <div>
                <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />
                <p className="mt-1 text-sm text-[#667085]">
                  {vehicle.type} · Bay {vehicle.bayId}
                </p>
              </div>
              <span className="text-sm font-medium text-ink">Continue</span>
            </Link>
          ))}
        </div>
      </DashboardSurface>
    </div>
  );
}
