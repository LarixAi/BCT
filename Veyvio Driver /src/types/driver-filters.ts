export type NavigationRouteFilter = "fastest" | "avoid_motorways" | "local_roads";

export type MapDisplayFilter = "standard" | "high_contrast" | "night";

export type TripsTodayFilter = "all" | "school_runs" | "passenger" | "movements";

export type CheckHistoryFilter = "all" | "nil_defects" | "defects";

export const NAVIGATION_ROUTE_FILTERS: { id: NavigationRouteFilter; label: string }[] = [
  { id: "fastest", label: "Fastest" },
  { id: "avoid_motorways", label: "Avoid motorways" },
  { id: "local_roads", label: "Local roads" },
];

export interface MapThemeOption {
  id: MapDisplayFilter;
  label: string;
  description: string;
}

/** Branded map themes aligned with Veyvio Driver (Midnight, Blue, light operational surfaces). */
export const MAP_DISPLAY_FILTERS: MapThemeOption[] = [
  {
    id: "standard",
    label: "Operational",
    description: "Light map matching depot screens",
  },
  {
    id: "high_contrast",
    label: "Field view",
    description: "Clear roads for outdoor shifts",
  },
  {
    id: "night",
    label: "Midnight",
    description: "Dark map matching app chrome",
  },
];

export const TRIPS_TODAY_FILTERS: { id: TripsTodayFilter; label: string }[] = [
  { id: "all", label: "All today" },
  { id: "school_runs", label: "School runs" },
  { id: "passenger", label: "Passenger" },
  { id: "movements", label: "Movements" },
];

export const CHECK_HISTORY_FILTERS: { id: CheckHistoryFilter; label: string }[] = [
  { id: "all", label: "All checks" },
  { id: "nil_defects", label: "Nil defects" },
  { id: "defects", label: "With defects" },
];

export function mapThemeClass(filter: MapDisplayFilter): string {
  return `map-theme-${filter}`;
}

export function osrmExcludeForRouteFilter(filter: NavigationRouteFilter): string | undefined {
  switch (filter) {
    case "avoid_motorways":
      return "motorway";
    case "local_roads":
      return "motorway,trunk";
    default:
      return undefined;
  }
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export function mapTileLayerForFilter(filter: MapDisplayFilter): {
  url: string;
  attribution: string;
} {
  switch (filter) {
    case "high_contrast":
      return {
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        attribution: CARTO_ATTRIBUTION,
      };
    case "night":
      return {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: CARTO_ATTRIBUTION,
      };
    default:
      return {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: CARTO_ATTRIBUTION,
      };
  }
}
