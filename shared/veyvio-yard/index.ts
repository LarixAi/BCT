import type { YardLayoutDefinition } from "./types";
import { BCT_MAIN_DEPOT_LAYOUT } from "./bct-main-depot";

/** Default spatial template — traced BCT depot plan; used until a depot publishes its own layout. */
export function defaultSpatialYardLayout(
  depotCode?: string | null,
  depotName?: string | null,
): YardLayoutDefinition {
  const code = depotCode?.trim().toUpperCase() || BCT_MAIN_DEPOT_LAYOUT.depotCode;
  const name = depotName?.trim()
    ? `${depotName.trim()} parking map`
    : BCT_MAIN_DEPOT_LAYOUT.name;
  return {
    ...BCT_MAIN_DEPOT_LAYOUT,
    depotCode: code,
    name,
  };
}

export function isLiveYardMapDepot(depotCode: string | null | undefined): boolean {
  return Boolean(depotCode?.trim());
}

export function resolveYardLayout(depotCode: string | null | undefined): YardLayoutDefinition | null {
  if (!depotCode?.trim()) return null;
  return defaultSpatialYardLayout(depotCode);
}

export interface SpatialVehicleRef {
  id: string;
  reg: string;
  bayId: string;
  status: string;
}

export interface SpatialBayRef {
  id: string;
  bayNumber?: number;
  displayName?: string;
  operationalStatus?: string;
}

export interface SpatialBayState {
  layoutBayId: string;
  bayNumber: number;
  displayName: string;
  operationalStatus: string;
  isLifo: boolean;
  isReserved: boolean;
  vehicle: SpatialVehicleRef | null;
}

export function buildSpatialBayStates(
  layout: YardLayoutDefinition,
  bays: SpatialBayRef[],
  vehicles: SpatialVehicleRef[],
): SpatialBayState[] {
  const vehicleByBayKey = new Map<string, SpatialVehicleRef>();
  for (const v of vehicles) {
    if (v.status === "Off-site") continue;
    vehicleByBayKey.set(v.bayId, v);
    vehicleByBayKey.set(normalizeBayKey(v.bayId), v);
  }

  return layout.bays.map(layoutBay => {
    const keys = [
      layoutBay.id,
      String(layoutBay.bayNumber),
      `BAY-${String(layoutBay.bayNumber).padStart(2, "0")}`,
      layoutBay.displayName,
    ];
    let vehicle: SpatialVehicleRef | null = null;
    for (const key of keys) {
      const hit = vehicleByBayKey.get(key) ?? vehicleByBayKey.get(normalizeBayKey(key));
      if (hit) {
        vehicle = hit;
        break;
      }
    }

    const storeBay = bays.find(b => keys.some(k => normalizeBayKey(b.id) === normalizeBayKey(k)));

    let operationalStatus = layoutBay.operationalStatus;
    if (storeBay?.operationalStatus) operationalStatus = storeBay.operationalStatus as typeof operationalStatus;
    if (vehicle) operationalStatus = "occupied";
    else if (layoutBay.isReserved && operationalStatus === "available") operationalStatus = "reserved";

    return {
      layoutBayId: layoutBay.id,
      bayNumber: layoutBay.bayNumber,
      displayName: layoutBay.displayName,
      operationalStatus,
      isLifo: layoutBay.isLifo,
      isReserved: layoutBay.isReserved,
      vehicle,
    };
  });
}

function normalizeBayKey(value: string): string {
  return value.replace(/^bay[-\s]*/i, "").replace(/^0+/, "").toUpperCase();
}

export function layoutCapacitySummary(states: SpatialBayState[]) {
  const total = states.length;
  const occupied = states.filter(s => s.vehicle).length;
  const reserved = states.filter(s => s.operationalStatus === "reserved" && !s.vehicle).length;
  const blocked = states.filter(s => s.operationalStatus === "blocked").length;
  return {
    total,
    occupied,
    available: total - occupied - blocked,
    reserved,
    blocked,
  };
}

export * from "./types";
export * from "./bct-main-depot";
