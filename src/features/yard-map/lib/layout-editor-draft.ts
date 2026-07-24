import type { LayoutBay, LayoutGate, LayoutZone, YardLayoutDefinition } from "@veyvio/yard";

export type LayoutEditorTool =
  | "move-bay"
  | "add-building"
  | "add-gate"
  | "add-entrance"
  | "add-exit"
  | "add-safety";

export type ParkingDirection = LayoutBay["parkingDirection"];

export type BayOverride = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  parkingDirection?: ParkingDirection;
};

export type LayoutEditorDraft = {
  bayOverrides: Record<string, BayOverride>;
  addedZones: LayoutZone[];
  addedGates: LayoutGate[];
};

const STORAGE_PREFIX = "veyvio-yard-layout-draft";
const LEGACY_PREFIX = "veyvio-yard-layout-overrides";

const DIR_CYCLE: Record<ParkingDirection, ParkingDirection> = {
  north: "east",
  east: "south",
  south: "west",
  west: "north",
};

function storageKey(depotCode: string, layoutId: string): string {
  return `${STORAGE_PREFIX}:${depotCode}:${layoutId}`;
}

function legacyKey(depotCode: string, layoutId: string): string {
  return `${LEGACY_PREFIX}:${depotCode}:${layoutId}`;
}

export function emptyDraft(): LayoutEditorDraft {
  return { bayOverrides: {}, addedZones: [], addedGates: [] };
}

export function loadLayoutDraft(depotCode: string, layoutId: string): LayoutEditorDraft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const raw = localStorage.getItem(storageKey(depotCode, layoutId));
    if (raw) {
      const parsed = JSON.parse(raw) as LayoutEditorDraft;
      return {
        bayOverrides: parsed.bayOverrides ?? {},
        addedZones: parsed.addedZones ?? [],
        addedGates: parsed.addedGates ?? [],
      };
    }
    const legacy = localStorage.getItem(legacyKey(depotCode, layoutId));
    if (legacy) {
      const bays = JSON.parse(legacy) as Record<string, BayOverride>;
      return { bayOverrides: bays ?? {}, addedZones: [], addedGates: [] };
    }
  } catch {
    /* ignore */
  }
  return emptyDraft();
}

export function saveLayoutDraft(depotCode: string, layoutId: string, draft: LayoutEditorDraft): void {
  localStorage.setItem(storageKey(depotCode, layoutId), JSON.stringify(draft));
}

export function clearLayoutDraft(depotCode: string, layoutId: string): void {
  localStorage.removeItem(storageKey(depotCode, layoutId));
  localStorage.removeItem(legacyKey(depotCode, layoutId));
}

export function rectToPolygon(x: number, y: number, w: number, h: number): [number, number][] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function nextParkingDirection(dir: ParkingDirection): ParkingDirection {
  return DIR_CYCLE[dir];
}

export function rotateBayOverride(
  bay: LayoutBay,
  current?: BayOverride,
): BayOverride {
  const dir = current?.parkingDirection ?? bay.parkingDirection;
  const width = current?.width ?? bay.geometry.width;
  const height = current?.height ?? bay.geometry.height;
  return {
    x: current?.x ?? bay.geometry.x,
    y: current?.y ?? bay.geometry.y,
    width: height,
    height: width,
    parkingDirection: nextParkingDirection(dir),
  };
}

export function applyLayoutDraft(
  layout: YardLayoutDefinition,
  draft: LayoutEditorDraft,
): YardLayoutDefinition {
  const hasBayPatches = Object.keys(draft.bayOverrides).length > 0;
  const bays = hasBayPatches
    ? layout.bays.map(bay => {
        const patch = draft.bayOverrides[bay.id];
        if (!patch) return bay;
        return {
          ...bay,
          parkingDirection: patch.parkingDirection ?? bay.parkingDirection,
          geometry: {
            ...bay.geometry,
            x: patch.x,
            y: patch.y,
            width: patch.width ?? bay.geometry.width,
            height: patch.height ?? bay.geometry.height,
          },
        };
      })
    : layout.bays;

  return {
    ...layout,
    bays,
    zones: [...layout.zones, ...draft.addedZones],
    gates: [...layout.gates, ...draft.addedGates],
  };
}

export function draftHasChanges(draft: LayoutEditorDraft): boolean {
  return (
    Object.keys(draft.bayOverrides).length > 0 ||
    draft.addedZones.length > 0 ||
    draft.addedGates.length > 0
  );
}

export function exportLayoutDraft(layout: YardLayoutDefinition, draft: LayoutEditorDraft): string {
  const applied = applyLayoutDraft(layout, draft);
  const bayLines = [...applied.bays]
    .sort((a, b) => a.bayNumber - b.bayNumber)
    .map(bay => {
      const { x, y, width, height } = bay.geometry;
      const dir = bay.parkingDirection;
      const cls = bay.vehicleClass ?? "minibus";
      const lifo = bay.isLifo ? ", isLifo: true" : "";
      const reserved = bay.isReserved ? ", isReserved: true" : "";
      const horizontal = dir === "east" || dir === "west";
      if (horizontal) {
        return `    bayH(${bay.bayNumber}, ${Math.round(x)}, ${Math.round(y)}, "${cls}")${lifo}${reserved}`;
      }
      const size =
        width !== 52 || height !== 92
          ? `, { w: ${Math.round(width)}, h: ${Math.round(height)} }`
          : "";
      return `    bay(${bay.bayNumber}, ${Math.round(x)}, ${Math.round(y)}, "${cls}"${size})${lifo}${reserved}`;
    });

  const zoneLines = draft.addedZones.map(z => {
    const pts = z.polygon.map(([px, py]) => `[${Math.round(px)}, ${Math.round(py)}]`).join(", ");
    return `    { id: "${z.id}", name: "${z.name}", kind: "${z.kind}", colourKey: "${z.colourKey}", polygon: [${pts}], vehicleAccess: ${z.vehicleAccess}, pedestrianAccess: ${z.pedestrianAccess}, parkingAllowed: ${z.parkingAllowed} }`;
  });

  const gateLines = draft.addedGates.map(g =>
    `    { id: "${g.id}", name: "${g.name}", kind: "${g.kind}", geometry: { x: ${Math.round(g.geometry.x)}, y: ${Math.round(g.geometry.y)}, width: ${Math.round(g.geometry.width)}, height: ${Math.round(g.geometry.height)} } }`,
  );

  return [
    "// Bays",
    bayLines.join(",\n"),
    draft.addedZones.length ? "\n// Added zones\n" + zoneLines.join(",\n") : "",
    draft.addedGates.length ? "\n// Added gates\n" + gateLines.join(",\n") : "",
  ].filter(Boolean).join("\n");
}

export function createZoneFromRect(
  tool: LayoutEditorTool,
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutZone | null {
  const width = Math.abs(w);
  const height = Math.abs(h);
  if (width < 12 || height < 12) return null;

  const left = w < 0 ? x + w : x;
  const top = h < 0 ? y + h : y;
  const id = `custom-zone-${Date.now()}`;

  if (tool === "add-safety") {
    return {
      id,
      name: "Safety — no parking",
      kind: "NO_PARKING",
      colourKey: "#FACC15",
      polygon: rectToPolygon(left, top, width, height),
      vehicleAccess: true,
      pedestrianAccess: false,
      parkingAllowed: false,
    };
  }

  if (tool === "add-building") {
    return {
      id,
      name: "Building",
      kind: "OFFICE",
      colourKey: "#2563EB",
      polygon: rectToPolygon(left, top, width, height),
      vehicleAccess: false,
      pedestrianAccess: true,
      parkingAllowed: false,
    };
  }

  return null;
}

export function createGateFromRect(
  tool: LayoutEditorTool,
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutGate | null {
  const width = Math.abs(w);
  const height = Math.abs(h);
  if (width < 12 || height < 8) return null;

  const left = w < 0 ? x + w : x;
  const top = h < 0 ? y + h : y;
  const id = `custom-gate-${Date.now()}`;

  const kind =
    tool === "add-entrance" ? "ENTRANCE" : tool === "add-exit" ? "EXIT" : "GATE";
  const name =
    tool === "add-entrance" ? "Entrance" : tool === "add-exit" ? "Exit" : "Entrance & Exit";

  return {
    id,
    name,
    kind,
    geometry: { x: left, y: top, width, height },
  };
}

export function isPlacementTool(tool: LayoutEditorTool): boolean {
  return tool !== "move-bay";
}
