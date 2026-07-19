/**
 * Driver map palette — light map with neutral roads and subtle landmark tints.
 */
export const DRIVER_MAP_COLORS = {
  land: "#F2F2F2",
  roadMajor: "#FFFFFF",
  roadMinor: "#FFFFFF",
  roadCasing: "#D6D6D6",
  roadSubtle: "#ECECEC",
  park: "#C5E1C5",
  parkOutline: "#A8D4A8",
  hospital: "#A8D4E8",
  police: "#8FA8C8",
  water: "#B8D4E8",
  label: "#6B7B8C",
  labelRoad: "#333333",
  labelLandmark: "#444444",
  labelHalo: "rgba(255, 255, 255, 0.95)",
  routeLine: "#1A1A1A",
  demandHot: "#FF8C42",
  demandWarm: "#FFA366",
  heatHot: "#FF6B6B",
  heatWarm: "#FFB347",
  heatMild: "#FFD699",
  heatCold: "#E2E8F0",
  markerBorder: "#D1D5DB",
  accentBlue: "#3B82F6",
};

export const DRIVER_MAP_CLASS = "driver-map-theme";

export const DRIVER_MAP_ROUTE_STYLE = {
  color: DRIVER_MAP_COLORS.routeLine,
  weight: 6,
  opacity: 0.95,
  lineCap: "round",
  lineJoin: "round",
};

export const DRIVER_MAP_ROUTE_STYLE_COMPACT = {
  ...DRIVER_MAP_ROUTE_STYLE,
  weight: 5,
  opacity: 0.95,
};

export function zoneHeatColor(intensity) {
  if (intensity >= 0.7) return DRIVER_MAP_COLORS.heatHot;
  if (intensity >= 0.55) return DRIVER_MAP_COLORS.heatWarm;
  if (intensity >= 0.45) return DRIVER_MAP_COLORS.heatMild;
  return DRIVER_MAP_COLORS.heatCold;
}

/** Subtle demand blobs on the home map — kept faint so the base map stays readable. */
export function zoneHeatCircleOptions(intensity) {
  const fill = zoneHeatColor(intensity);
  return {
    color: fill,
    fillColor: fill,
    fillOpacity: 0.06 + intensity * 0.08,
    weight: 0,
    opacity: 0,
  };
}

/** Stronger heat circles for the dedicated Hot Areas screen. */
export function zoneHeatCircleOptionsStrong(intensity) {
  const fill = zoneHeatColor(intensity);
  return {
    color: fill,
    fillColor: fill,
    fillOpacity: 0.18 + intensity * 0.2,
    weight: 0,
    opacity: 0,
  };
}
