// Live Yard Map — shared types (Yard app + Admin + Command projections).

export type YardZoneKind =
  | "PARKING"
  | "ROADWAY"
  | "PEDESTRIAN"
  | "NO_PARKING"
  | "LIFO"
  | "RESERVED"
  | "WORKSHOP"
  | "WASH"
  | "FUEL"
  | "ADBLUE"
  | "OFFICE"
  | "CONTAINER"
  | "ENTRANCE"
  | "EXIT"
  | "GATE"
  | "HOLDING"
  | "VOR"
  | "CLEANING"
  | "EMERGENCY";

export type BayOperationalStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "blocked"
  | "out_of_service"
  | "temporary_closure"
  | "maintenance_use"
  | "unknown";

export type BayVehicleClass = "minibus" | "mpv";

export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface LayoutZone {
  id: string;
  name: string;
  kind: YardZoneKind;
  colourKey: string;
  polygon: [number, number][];
  vehicleAccess: boolean;
  pedestrianAccess: boolean;
  parkingAllowed: boolean;
}

export interface LayoutBay {
  id: string;
  bayNumber: number;
  displayName: string;
  zoneId: string;
  geometry: MapRect;
  parkingDirection: "north" | "south" | "east" | "west";
  vehicleClass?: BayVehicleClass;
  isLifo: boolean;
  isReserved: boolean;
  operationalStatus: BayOperationalStatus;
  capacity: number;
}

export interface LayoutGate {
  id: string;
  name: string;
  kind: "ENTRANCE" | "EXIT" | "GATE";
  geometry: MapRect;
}

export interface YardLayoutDefinition {
  id: string;
  depotCode: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  zones: LayoutZone[];
  bays: LayoutBay[];
  gates: LayoutGate[];
}

export type MapLayerId =
  | "bays"
  | "vehicles"
  | "statuses"
  | "pedestrian"
  | "roadway"
  | "restrictions"
  | "buildings"
  | "gates"
  | "labels";

export const DEFAULT_MAP_LAYERS: Record<MapLayerId, boolean> = {
  bays: true,
  vehicles: true,
  statuses: true,
  pedestrian: true,
  roadway: true,
  restrictions: true,
  buildings: true,
  gates: true,
  labels: true,
};

export interface YardHubLayoutSnapshot {
  layoutId: string;
  depotCode: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  yardMapEnabled: boolean;
  zones: LayoutZone[];
  bays: LayoutBay[];
  gates: LayoutGate[];
}

export interface YardHubVehicleLocation {
  vehicleId: string;
  bayId: string | null;
  bayNumber: number | null;
  bayLabel: string | null;
  confidence: string;
  source: string;
  reportedAt: string | null;
}
