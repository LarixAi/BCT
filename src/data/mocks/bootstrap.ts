import * as fx from "@/data/fixtures";
import { initialVehicleEquipment, initialDepotStock } from "@/data/equipment-fixtures";
import { initialTasks } from "@/data/tasks-fixtures";
import * as cfx from "@/data/condition-fixtures";
import { initialAdBlueRefills } from "@/data/adblue-fixtures";
import { buildDemoOperationalPlan } from "@/data/plan-fixtures";
import { BCT_MAIN_DEPOT_LAYOUT } from "@veyvio/yard";
import type { YardHubLayoutSnapshot } from "@veyvio/yard";
import { bctBays, bctDriverBodyworkObservations, bctTrips, bctVehicles } from "@/data/bct-yard";
import { ROLE_PERMISSIONS, type YardRole } from "@/types/permissions";
import {
  BOOTSTRAP_SCHEMA_VERSION,
  COMMAND_HUB_BOOTSTRAP_SOURCE,
  normalizeLiveBootstrapPayload,
  type BootstrapPayload,
} from "@/platform/yard/bootstrap-payload";

export {
  BOOTSTRAP_SCHEMA_VERSION,
  COMMAND_HUB_BOOTSTRAP_SOURCE,
  buildLiveBootstrapShell,
  normalizeLiveBootstrapPayload,
  type BootstrapDataSource,
  type BootstrapPayload,
} from "@/platform/yard/bootstrap-payload";

export function buildBootstrapPayload(companyId: string, depotId: string, role: YardRole = "yard_manager"): BootstrapPayload {
  if (depotId === "dep_bct_main") {
    const yardLayout: YardHubLayoutSnapshot = {
      layoutId: BCT_MAIN_DEPOT_LAYOUT.id,
      depotCode: BCT_MAIN_DEPOT_LAYOUT.depotCode,
      name: BCT_MAIN_DEPOT_LAYOUT.name,
      canvasWidth: BCT_MAIN_DEPOT_LAYOUT.canvasWidth,
      canvasHeight: BCT_MAIN_DEPOT_LAYOUT.canvasHeight,
      yardMapEnabled: true,
      zones: BCT_MAIN_DEPOT_LAYOUT.zones,
      bays: BCT_MAIN_DEPOT_LAYOUT.bays,
      gates: BCT_MAIN_DEPOT_LAYOUT.gates,
    };
    return {
      companyId,
      depotId,
      depotCode: "BCT-MAIN",
      yardMapEnabled: true,
      yardLayout,
      syncedAt: new Date().toISOString(),
      dataSource: "mock",
      schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
      vehicles: bctVehicles,
      bays: bctBays,
      trips: bctTrips,
      defects: [],
      vorCases: [],
      movements: [],
      yardChecks: [],
      equipment: initialVehicleEquipment,
      depotStock: initialDepotStock,
      permissions: ROLE_PERMISSIONS[role],
      shiftWindow: "Day shift",
      tasks: initialTasks,
      conditionProfiles: cfx.buildInitialConditionProfiles(bctVehicles.map(v => v.id)),
      inspections: [],
      inspectionMedia: [],
      damageRecords: [],
      damageObservations: bctDriverBodyworkObservations,
      damageReviews: [],
      conditionSnapshots: [],
      custodyTimeline: [],
      repairWorkOrders: [],
      adblueRefills: initialAdBlueRefills,
      operationalPlan: null,
    };
  }

  return {
    companyId,
    depotId,
    syncedAt: new Date().toISOString(),
    dataSource: "mock",
    schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
    vehicles: fx.vehicles,
    bays: fx.bays,
    trips: fx.trips,
    defects: fx.defects,
    vorCases: fx.vorCases,
    movements: fx.movements,
    yardChecks: fx.yardChecks,
    equipment: initialVehicleEquipment,
    depotStock: initialDepotStock,
    permissions: ROLE_PERMISSIONS[role],
    shiftWindow: fx.SHIFT.window,
    tasks: initialTasks,
    conditionProfiles: cfx.buildInitialConditionProfiles(fx.vehicles.map(v => v.id)),
    inspections: cfx.inspections,
    inspectionMedia: cfx.inspectionMedia,
    damageRecords: cfx.damageRecords,
    damageObservations: cfx.damageObservations,
    damageReviews: cfx.damageReviews,
    conditionSnapshots: cfx.conditionSnapshots,
    custodyTimeline: cfx.custodyTimeline,
    repairWorkOrders: cfx.repairWorkOrders,
    adblueRefills: initialAdBlueRefills,
    operationalPlan: buildDemoOperationalPlan(companyId, depotId),
  };
}

/** Back-fill fields missing from older IndexedDB bootstrap caches. */
export function normalizeBootstrapPayload(
  payload: Partial<BootstrapPayload> & Pick<BootstrapPayload, "companyId" | "depotId">,
  role: YardRole = "yard_manager",
): BootstrapPayload {
  if (payload.dataSource === COMMAND_HUB_BOOTSTRAP_SOURCE) {
    return normalizeLiveBootstrapPayload(payload, role);
  }

  const defaults = buildBootstrapPayload(payload.companyId, payload.depotId, role);
  return {
    ...defaults,
    ...payload,
    schemaVersion: payload.schemaVersion ?? BOOTSTRAP_SCHEMA_VERSION,
    tasks: payload.tasks ?? defaults.tasks,
    permissions: payload.permissions ?? defaults.permissions,
    shiftWindow: payload.shiftWindow ?? defaults.shiftWindow,
    conditionProfiles: payload.conditionProfiles ?? defaults.conditionProfiles,
    inspections: payload.inspections ?? defaults.inspections,
    inspectionMedia: payload.inspectionMedia ?? defaults.inspectionMedia,
    damageRecords: payload.damageRecords ?? defaults.damageRecords,
    damageObservations: payload.damageObservations ?? defaults.damageObservations,
    damageReviews: payload.damageReviews ?? defaults.damageReviews,
    conditionSnapshots: payload.conditionSnapshots ?? defaults.conditionSnapshots,
    custodyTimeline: payload.custodyTimeline ?? defaults.custodyTimeline,
    repairWorkOrders: payload.repairWorkOrders ?? defaults.repairWorkOrders,
    adblueRefills: payload.adblueRefills ?? defaults.adblueRefills,
    operationalPlan:
      payload.operationalPlan === undefined ? defaults.operationalPlan : payload.operationalPlan,
  };
}
