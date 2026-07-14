import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
import { MapThemePicker } from "@/components/driver/journey/MapThemePicker";
import {
  NAVIGATION_ROUTE_FILTERS,
  type NavigationRouteFilter,
  type MapDisplayFilter,
} from "@/types/driver-filters";
import { useDriverPreferencesStore } from "@/store/driver-preferences";
import { useNavigationStore } from "@/store/navigation";

export function NavigationCustomFilters({ dutyId }: { dutyId: string }) {
  const routeFilter = useDriverPreferencesStore((s) => s.navigationRouteFilter);
  const mapFilter = useDriverPreferencesStore((s) => s.mapDisplayFilter);
  const setRouteFilter = useDriverPreferencesStore((s) => s.setNavigationRouteFilter);
  const setMapFilter = useDriverPreferencesStore((s) => s.setMapDisplayFilter);
  const clearRoute = useNavigationStore((s) => s.clearRoute);

  function handleRouteFilterChange(filter: NavigationRouteFilter) {
    setRouteFilter(filter);
    clearRoute(dutyId);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Route preference</p>
        <FilterChipBar
          label="Route preference"
          size="sm"
          options={NAVIGATION_ROUTE_FILTERS}
          active={routeFilter}
          onChange={handleRouteFilterChange}
        />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Map colour</p>
        <MapThemePicker active={mapFilter} onChange={setMapFilter} />
      </div>
    </div>
  );
}
