import type { YardLayoutDefinition } from "./types";

export type BayVehicleClass = "minibus" | "mpv";

/** BCT Main Depot — traced from official BCT Depot Parking map (26 numbered bays). */
export const BCT_MAIN_DEPOT_LAYOUT: YardLayoutDefinition = {
  id: "bct-main-depot-v4",
  depotCode: "BCT-MAIN",
  name: "BCT Depot Parking Map",
  canvasWidth: 1040,
  canvasHeight: 760,
  gates: [
    { id: "gate-entrance-top", name: "Entrance", kind: "ENTRANCE", geometry: { x: 868, y: 8, width: 118, height: 22 } },
    { id: "gate-main", name: "Entrance & Exit", kind: "GATE", geometry: { x: 408, y: 688, width: 184, height: 22 } },
  ],
  zones: [
    {
      id: "zone-main-office",
      name: "Main Portacabin",
      kind: "OFFICE",
      colourKey: "#2563EB",
      polygon: [[24, 18], [272, 18], [272, 112], [24, 112]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-portacabin-2",
      name: "Portacabin 2",
      kind: "OFFICE",
      colourKey: "#2563EB",
      polygon: [[28, 378], [152, 378], [152, 452], [28, 452]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-container",
      name: "Container",
      kind: "CONTAINER",
      colourKey: "#2563EB",
      polygon: [[24, 648], [96, 648], [96, 712], [24, 712]],
      vehicleAccess: false,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    // Pedestrian corridors traced from depot plan — narrow walkways between bays, not over them.
    {
      id: "zone-pedestrian-north",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[280, 18], [860, 18], [860, 100], [280, 100]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-pedestrian-west-aisle",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[136, 112], [220, 112], [220, 368], [152, 368], [152, 468], [248, 468], [248, 680], [136, 680]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-pedestrian-centre",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[248, 240], [360, 240], [360, 520], [248, 520]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-pedestrian-east-aisle",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[970, 36], [988, 36], [988, 680], [970, 680]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-pedestrian-col-gap-1",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[688, 108], [706, 108], [706, 564], [688, 564]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-pedestrian-col-gap-2",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[758, 108], [776, 108], [776, 564], [758, 564]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    {
      id: "zone-pedestrian-col-gap-3",
      name: "Pedestrian routes",
      kind: "PEDESTRIAN",
      colourKey: "#86EFAC",
      polygon: [[828, 108], [846, 108], [846, 564], [828, 564]],
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    },
    // Vehicle circulation loop — yellow hatched paths on depot plan.
    {
      id: "zone-roadway-north",
      name: "Vehicle circulation",
      kind: "ROADWAY",
      colourKey: "#FEF08A",
      polygon: [[248, 100], [860, 100], [860, 108], [680, 108], [680, 200], [560, 200], [560, 400], [360, 400], [360, 520], [248, 520], [248, 100]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    {
      id: "zone-roadway-south",
      name: "Vehicle circulation",
      kind: "ROADWAY",
      colourKey: "#FEF08A",
      polygon: [[160, 520], [680, 520], [680, 688], [160, 688]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    {
      id: "zone-roadway-west",
      name: "Vehicle circulation",
      kind: "ROADWAY",
      colourKey: "#FEF08A",
      polygon: [[96, 520], [160, 520], [160, 688], [96, 688]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    {
      id: "zone-roadway-entrance-ramp",
      name: "Vehicle circulation",
      kind: "ROADWAY",
      colourKey: "#FEF08A",
      polygon: [[820, 36], [970, 36], [970, 108], [820, 108]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    {
      id: "zone-no-park-entrance",
      name: "Obstruct",
      kind: "NO_PARKING",
      colourKey: "#FACC15",
      polygon: [[820, 36], [988, 36], [988, 118], [820, 118]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    {
      id: "zone-no-park-centre",
      name: "Obstruct",
      kind: "NO_PARKING",
      colourKey: "#FACC15",
      polygon: [[520, 260], [680, 260], [680, 420], [520, 420]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
    {
      id: "zone-no-park-neck",
      name: "Obstruct",
      kind: "NO_PARKING",
      colourKey: "#FACC15",
      polygon: [[152, 468], [248, 468], [248, 520], [152, 520]],
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    },
  ],
  bays: [
    // —— Eastern minibus columns (face north) ——
    bay(1, 918, 472, "minibus"),
    bay(2, 918, 352, "minibus"),
    bay(3, 918, 232, "minibus"),
    { ...bay(4, 918, 108, "minibus", { h: 118 }), geometry: { x: 918, y: 108, width: 52, height: 118 } },
    bay(5, 848, 442, "minibus"),
    bay(6, 848, 322, "minibus"),
    bay(7, 848, 202, "minibus"),
    bay(8, 778, 442, "minibus"),
    bay(9, 778, 322, "minibus"),
    { ...bay(10, 778, 202, "minibus"), isLifo: true, isReserved: true },
    bay(11, 708, 402, "minibus"),
    bay(12, 708, 262, "minibus"),
    // —— Centre row + LIFO reserve ——
    bayH(13, 598, 432, "minibus"),
    bayH(14, 598, 492, "minibus"),
    { ...bay(15, 638, 278, "minibus"), isLifo: true, isReserved: true },
    // —— North-west minibuses ——
    bay(25, 292, 28, "minibus"),
    bay(26, 292, 128, "minibus"),
    bay(21, 162, 392, "minibus", { w: 52, h: 72 }),
    bay(16, 108, 608, "minibus"),
    // —— MPV stacks (orange on depot plan) ——
    bayH(24, 36, 130, "mpv"),
    bayH(23, 36, 182, "mpv"),
    bayH(22, 36, 234, "mpv"),
    bayH(20, 28, 468, "mpv"),
    bayH(19, 28, 520, "mpv"),
    bayH(18, 28, 572, "mpv"),
    bayH(17, 28, 624, "mpv"),
  ].sort((a, b) => a.bayNumber - b.bayNumber),
};

function bay(
  n: number,
  x: number,
  y: number,
  vehicleClass: BayVehicleClass,
  size?: { w?: number; h?: number },
) {
  const w = size?.w ?? 52;
  const h = size?.h ?? 92;
  return {
    id: `BAY-${String(n).padStart(2, "0")}`,
    bayNumber: n,
    displayName: `Bay ${n}`,
    zoneId: "zone-parking-main",
    geometry: { x, y, width: w, height: h },
    parkingDirection: "north" as const,
    vehicleClass,
    isLifo: false,
    isReserved: false,
    operationalStatus: "available" as const,
    capacity: 1,
  };
}

function bayH(n: number, x: number, y: number, vehicleClass: BayVehicleClass) {
  return {
    ...bay(n, x, y, vehicleClass, { w: 108, h: 44 }),
    parkingDirection: "east" as const,
    geometry: { x, y, width: 108, height: 44 },
  };
}

/** MPV bay numbers per BCT depot legend (orange). */
export const BCT_MPV_BAY_NUMBERS = new Set([17, 18, 19, 20, 22, 23, 24]);

export const BCT_DEPOT_META = {
  code: "BCT-MAIN",
  name: "BCT Main Depot",
  timezone: "Europe/London",
} as const;
