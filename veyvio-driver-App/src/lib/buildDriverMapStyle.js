/**
 * Driver MapLibre style — light Positron base with main civic landmarks (hospital, police).
 */
import { DRIVER_MAP_COLORS } from "./driverMapTheme";

const STYLE_VERSION = 10;

const ROAD_MAJOR_INNER = new Set([
  "highway_major_inner",
  "highway_motorway_inner",
  "highway_motorway_bridge_inner",
  "tunnel_motorway_inner",
]);

const ROAD_MINOR = new Set(["highway_minor", "highway_path"]);

const ROAD_CASING = new Set([
  "highway_major_casing",
  "highway_motorway_casing",
  "highway_motorway_bridge_casing",
  "tunnel_motorway_casing",
]);

const ROAD_SUBTLE = new Set(["highway_major_subtle", "highway_motorway_subtle"]);

const PARK_LAYER_IDS = new Set(["park", "landcover_wood"]);

const ROAD_LABEL_IDS = new Set([
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
]);

const PLACE_LABEL_IDS = new Set([
  "label_other",
  "label_village",
  "label_town",
  "label_state",
  "label_city",
  "label_city_capital",
]);

/** Solid landuse fills — opaque blocks, no outline ring. */
function landuseFillLayer(id, classes, color, minzoom = 12) {
  return {
    id,
    type: "fill",
    source: "openmaptiles",
    "source-layer": "landuse",
    minzoom,
    filter: ["match", ["get", "class"], classes, true, false],
    paint: {
      "fill-color": color,
      "fill-opacity": 1,
      "fill-antialias": false,
    },
  };
}

/** Main civic landmarks only — hospital campuses (polygons) and police stations (points). */
const LANDMARK_LANDUSE_LAYERS = [
  landuseFillLayer("landuse_hospital", ["hospital"], DRIVER_MAP_COLORS.hospital, 12),
];

const POI_HOSPITAL_LAYER = {
  id: "poi_hospital",
  type: "circle",
  source: "openmaptiles",
  "source-layer": "poi",
  minzoom: 13,
  filter: ["==", ["get", "class"], "hospital"],
  paint: {
    "circle-color": DRIVER_MAP_COLORS.hospital,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 5, 16, 9],
    "circle-opacity": 1,
    "circle-stroke-width": 0,
  },
};

const POI_POLICE_LAYER = {
  id: "poi_police",
  type: "circle",
  source: "openmaptiles",
  "source-layer": "poi",
  minzoom: 13,
  filter: ["==", ["get", "class"], "police"],
  paint: {
    "circle-color": DRIVER_MAP_COLORS.police,
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 5, 16, 9],
    "circle-opacity": 1,
    "circle-stroke-width": 0,
  },
};

const LANDMARK_POI_CLASSES = ["hospital", "police"];

const POI_LANDMARK_LABEL = {
  id: "poi_landmark_label",
  type: "symbol",
  source: "openmaptiles",
  "source-layer": "poi",
  minzoom: 15,
  filter: [
    "all",
    ["has", "name"],
    ["match", ["get", "class"], LANDMARK_POI_CLASSES, true, false],
  ],
  layout: {
    "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
    "text-font": ["Noto Sans Regular"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 17, 11],
    "text-anchor": "top",
    "text-offset": [0, 0.5],
    "text-max-width": 8,
    "text-allow-overlap": false,
    "text-padding": 4,
  },
  paint: {
    "text-color": DRIVER_MAP_COLORS.labelLandmark,
    "text-halo-color": DRIVER_MAP_COLORS.labelHalo,
    "text-halo-width": 1.6,
    "text-halo-blur": 0.2,
  },
};

function bumpTextSize(sizeExpr, delta = 1) {
  if (!Array.isArray(sizeExpr) || sizeExpr[0] !== "interpolate") return sizeExpr;
  const out = [...sizeExpr];
  for (let i = 4; i < out.length; i += 2) {
    if (typeof out[i] === "number") out[i] = out[i] + delta;
  }
  return out;
}

function patchRoadLabel(layer) {
  const isMajor = layer.id === "highway-name-major";
  layer.minzoom = isMajor ? 12 : 13;
  layer.layout = {
    ...layer.layout,
    "text-font": [isMajor ? "Noto Sans Bold" : "Noto Sans Regular"],
    "text-size": bumpTextSize(layer.layout?.["text-size"], isMajor ? 1 : 0),
  };
  layer.paint = {
    ...layer.paint,
    "text-color": DRIVER_MAP_COLORS.labelRoad,
    "text-halo-color": DRIVER_MAP_COLORS.labelHalo,
    "text-halo-width": 1.8,
    "text-halo-blur": 0.2,
  };
  return layer;
}

function patchPlaceLabel(layer) {
  layer.paint = {
    ...layer.paint,
    "text-color": DRIVER_MAP_COLORS.label,
    "text-halo-color": DRIVER_MAP_COLORS.labelHalo,
    "text-halo-width": 1.6,
    "text-halo-blur": 0.2,
  };
  return layer;
}

function patchRoadLayer(layer) {
  if (ROAD_MAJOR_INNER.has(layer.id)) {
    layer.paint = {
      ...layer.paint,
      "line-color": DRIVER_MAP_COLORS.roadMajor,
      "line-opacity": 1,
    };
  } else if (ROAD_MINOR.has(layer.id)) {
    layer.paint = {
      ...layer.paint,
      "line-color": DRIVER_MAP_COLORS.roadMinor,
      "line-opacity": 1,
    };
  } else if (ROAD_CASING.has(layer.id)) {
    layer.paint = {
      ...layer.paint,
      "line-color": DRIVER_MAP_COLORS.roadCasing,
      "line-opacity": 0.85,
    };
  } else if (ROAD_SUBTLE.has(layer.id)) {
    layer.paint = {
      ...layer.paint,
      "line-color": DRIVER_MAP_COLORS.roadSubtle,
      "line-opacity": 0.5,
    };
  }
  return layer;
}

function patchLayer(layer) {
  if (layer.id === "background") {
    layer.paint = { "background-color": DRIVER_MAP_COLORS.land };
    return layer;
  }

  if (layer.id === "landuse_residential") {
    layer.paint = {
      ...layer.paint,
      "fill-color": "#EDEDED",
      "fill-opacity": 0.5,
    };
    return layer;
  }

  if (PARK_LAYER_IDS.has(layer.id)) {
    layer.paint = {
      ...layer.paint,
      "fill-color": DRIVER_MAP_COLORS.park,
      "fill-opacity": 0.85,
      "fill-outline-color": DRIVER_MAP_COLORS.parkOutline,
    };
    return layer;
  }

  if (layer.id === "water") {
    layer.paint = {
      ...layer.paint,
      "fill-color": DRIVER_MAP_COLORS.water,
      "fill-opacity": 0.9,
    };
    return layer;
  }

  if (layer.id === "railway" || layer.id === "railway_dashline") {
    layer.paint = {
      ...layer.paint,
      "line-color": "#C8C8C8",
      "line-opacity": 0.7,
    };
    return layer;
  }

  if (layer.id === "building") {
    layer.paint = {
      ...layer.paint,
      "fill-color": "#E4E4E4",
      "fill-outline-color": "#DADADA",
      "fill-opacity": 0.7,
    };
    return layer;
  }

  if (layer.paint?.["line-color"]) {
    patchRoadLayer(layer);
  }

  if (layer.id === "airport") {
    layer.paint = {
      ...layer.paint,
      "text-color": DRIVER_MAP_COLORS.labelLandmark,
      "text-halo-color": DRIVER_MAP_COLORS.labelHalo,
      "text-halo-width": 1.6,
    };
    return layer;
  }

  if (ROAD_LABEL_IDS.has(layer.id)) return patchRoadLabel(layer);
  if (PLACE_LABEL_IDS.has(layer.id)) return patchPlaceLabel(layer);

  if (layer.id === "water_name_point_label" || layer.id === "water_name_line_label") {
    layer.paint = {
      ...layer.paint,
      "text-color": "#5A7A94",
      "text-halo-color": DRIVER_MAP_COLORS.labelHalo,
      "text-halo-width": 1.5,
    };
  }

  return layer;
}

function insertLandmarkLayers(style) {
  const parkIdx = style.layers.findIndex(l => l.id === "park");
  const insertAt = parkIdx >= 0 ? parkIdx + 1 : 2;
  style.layers.splice(insertAt, 0, ...LANDMARK_LANDUSE_LAYERS, POI_HOSPITAL_LAYER, POI_POLICE_LAYER);

  const roadLabelIdx = style.layers.findIndex(l => l.id === "highway-name-major");
  const labelInsertAt = roadLabelIdx >= 0 ? roadLabelIdx : style.layers.length;
  style.layers.splice(labelInsertAt, 0, POI_LANDMARK_LABEL);
}

export async function fetchDriverMapStyle() {
  const res = await fetch("https://tiles.openfreemap.org/styles/positron");
  if (!res.ok) throw new Error("Failed to load base map style");
  const style = await res.json();
  style.layers = style.layers.map(patchLayer);
  insertLandmarkLayers(style);
  return style;
}

let cachedStyle = null;
let cachedVersion = null;

export async function getDriverMapStyle() {
  if (cachedStyle && cachedVersion === STYLE_VERSION) return cachedStyle;
  cachedStyle = await fetchDriverMapStyle();
  cachedVersion = STYLE_VERSION;
  return cachedStyle;
}

export function resetDriverMapStyleCache() {
  cachedStyle = null;
  cachedVersion = null;
}

export const DRIVER_MAP_ATTRIBUTION =
  '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org">OpenFreeMap</a>';
