/** London area preference zones for driver trip filtering. */

import areaPolygons from "./driverAreaPolygons.json";

export const AREA_PREFERENCES_STORAGE_KEY = "driver_area_preferences_v1";

/**
 * Wide-zoom tessellated zones traced from public/driver-area-reference-wide-map.png.
 * Regenerate with: python3 scripts/trace-driver-area-zones.py
 */

/** Regional map frame — [[south, west], [north, east]] */
export const DRIVER_AREA_MAP_BOUNDS = areaPolygons.bounds;

export const AREA_REFERENCE_ZOOMED_BOUNDS = [
  [51.345, -0.42],
  [51.615, 0.11],
];

export const AREA_REFERENCE_WIDE_BOUNDS = areaPolygons.bounds;

export const LONDON_CCZ_POLYGON = areaPolygons.ccz.polygon;

/** @type {{ id: string, label: string, center: [number, number], polygon: [number, number][] }[]} */
export const DRIVER_AREA_OPTIONS = [
  {
    id: "ccz",
    label: "Congestion Charge Zone",
    center: areaPolygons.ccz.center,
    polygon: LONDON_CCZ_POLYGON,
  },
  {
    id: "north",
    label: "North London",
    center: areaPolygons.sectors.north.center,
    polygon: areaPolygons.sectors.north.polygon,
  },
  {
    id: "west",
    label: "West London",
    center: areaPolygons.sectors.west.center,
    polygon: areaPolygons.sectors.west.polygon,
  },
  {
    id: "east",
    label: "East London",
    center: areaPolygons.sectors.east.center,
    polygon: areaPolygons.sectors.east.polygon,
  },
  {
    id: "south",
    label: "South London",
    center: areaPolygons.sectors.south.center,
    polygon: areaPolygons.sectors.south.polygon,
  },
];

export const DEFAULT_AREA_SELECTION = {
  ccz: true,
  north: true,
  west: true,
  east: true,
  south: true,
};

export function loadDriverAreaPreferences() {
  try {
    const raw = JSON.parse(localStorage.getItem(AREA_PREFERENCES_STORAGE_KEY) || "{}");
    return { ...DEFAULT_AREA_SELECTION, ...raw };
  } catch {
    return { ...DEFAULT_AREA_SELECTION };
  }
}

export function saveDriverAreaPreferences(selection) {
  localStorage.setItem(AREA_PREFERENCES_STORAGE_KEY, JSON.stringify(selection));
}

export function pointInPolygon(lat, lng, polygon) {
  if (lat == null || lng == null || !polygon?.length) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function detectDriverHomeArea(lat, lng) {
  if (lat == null || lng == null) return null;
  const ccz = DRIVER_AREA_OPTIONS.find(a => a.id === "ccz");
  if (ccz && pointInPolygon(lat, lng, ccz.polygon)) return ccz.id;
  for (const area of DRIVER_AREA_OPTIONS) {
    if (area.id === "ccz") continue;
    if (pointInPolygon(lat, lng, area.polygon)) return area.id;
  }
  let best = null;
  let bestDist = Infinity;
  for (const area of DRIVER_AREA_OPTIONS) {
    const [cy, cx] = area.center;
    const d = (cy - lat) ** 2 + (cx - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = area.id;
    }
  }
  return best;
}
