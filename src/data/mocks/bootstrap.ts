import * as fx from "@/data/fixtures";
import { bays as defaultYardBays } from "@/data/fixtures";
import { initialVehicleEquipment, initialDepotStock } from "@/data/equipment-fixtures";
import { initialTasks } from "@/data/tasks-fixtures";
import * as cfx from "@/data/condition-fixtures";
import { initialAdBlueRefills } from "@/data/adblue-fixtures";
import { buildDemoOperationalPlan } from "@/data/plan-fixtures";
import { BCT_MAIN_DEPOT_LAYOUT } from "@veyvio/yard";
import type { YardHubLayoutSnapshot } from "@veyvio/yard";
import { bctBays, bctTrips, bctVehicles } from "@/data/bct-yard";
import type {
  CustodyEvent,
  DamageObservation,
  DamageRecord,
  DamageReview,
  InspectionMedia,
  RepairWorkOrder,
  VehicleConditionProfile,
  VehicleConditionSnapshot,
  VehicleInspection,
} from "@/types/condition";
import type { OperationalDayPlan } from "@/types/plan";
import { ROLE_PERMISSIONS, type YardRole } from "@/types/permissions";
import type { YardTask } from "@/types/tasks";

export const BOOTSTRAP_SCHEMA_VERSION = 6;

export const COMMAND_HUB_BOOTSTRAP_SOURCE = "command-hub" as const;

export type BootstrapDataSource = "mock" | typeof COMMAND_HUB_BOOTSTRAP_SOURCE;

export interface BootstrapPayload {
  companyId: string;
  depotId: string;
  depotCode?: string | null;
  yardMapEnabled?: boolean;
  yardLayout?: YardHubLayoutSnapshot | null;
  syncedAt: string;
  dataSource?: BootstrapDataSource;
  vehicles: typeof fx.vehicles;
  bays: typeof fx.bays;
  trips: typeof fx.trips;
  defects: typeof fx.defects;
  vorCases: typeof fx.vorCases;
  movements: typeof fx.movements;
  yardChecks: typeof fx.yardChecks;
  equipment: typeof initialVehicleEquipment;
  depotStock: typeof initialDepotStock;
  permissions: string[];
  shiftWindow: string;
  tasks: YardTask[];
  schemaVersion: number;
  conditionProfiles: Record<string, VehicleConditionProfile>;
  inspections: VehicleInspection[];
  inspectionMedia: InspectionMedia[];
  damageRecords: DamageRecord[];
  damageObservations: DamageObservation[];
  damageReviews: DamageReview[];
  conditionSnapshots: VehicleConditionSnapshot[];
  custodyTimeline: CustodyEvent[];
  repairWorkOrders: RepairWorkOrder[];
  adblueRefills: typeof initialAdBlueRefills;
  operationalPlan: OperationalDayPlan | null;
}

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
      damageObservations: [],
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

/** Live Command hub — structural bays only; no demo fleet, trips, or plan. */
export function buildLiveBootstrapShell(
  companyId: string,
  depotId: string,
  role: YardRole = "yard_manager",
): BootstrapPayload {
  return {
    companyId,
    depotId,
    syncedAt: new Date().toISOString(),
    dataSource: COMMAND_HUB_BOOTSTRAP_SOURCE,
    schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
    vehicles: [],
    bays: defaultYardBays.map(b => ({ ...b })),
    trips: [],
    defects: [],
    vorCases: [],
    movements: [],
    yardChecks: [],
    equipment: {},
    depotStock: {},
    permissions: ROLE_PERMISSIONS[role],
    shiftWindow: "Day shift",
    tasks: [],
    conditionProfiles: {},
    inspections: [],
    inspectionMedia: [],
    damageRecords: [],
    damageObservations: [],
    damageReviews: [],
    conditionSnapshots: [],
    custodyTimeline: [],
    repairWorkOrders: [],
    adblueRefills: [],
    operationalPlan: null,
  };
}

/** Back-fill fields missing from older IndexedDB bootstrap caches. */
export function normalizeBootstrapPayload(
  payload: Partial<BootstrapPayload> & Pick<BootstrapPayload, "companyId" | "depotId">,
  role: YardRole = "yard_manager",
): BootstrapPayload {
  if (payload.dataSource === COMMAND_HUB_BOOTSTRAP_SOURCE) {
    const shell = buildLiveBootstrapShell(payload.companyId, payload.depotId, role);
    return {
      ...shell,
      ...payload,
      dataSource: COMMAND_HUB_BOOTSTRAP_SOURCE,
      schemaVersion: payload.schemaVersion ?? BOOTSTRAP_SCHEMA_VERSION,
      permissions: payload.permissions ?? shell.permissions,
      bays: payload.bays ?? shell.bays,
    };
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
