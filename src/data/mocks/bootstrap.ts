import * as fx from "@/data/fixtures";
import { initialVehicleEquipment, initialDepotStock } from "@/data/equipment-fixtures";
import { initialTasks } from "@/data/tasks-fixtures";
import * as cfx from "@/data/condition-fixtures";
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
import { ROLE_PERMISSIONS, type YardRole } from "@/types/permissions";
import type { YardTask } from "@/types/tasks";

export interface BootstrapPayload {
  companyId: string;
  depotId: string;
  syncedAt: string;
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
}

export const BOOTSTRAP_SCHEMA_VERSION = 4;

export function buildBootstrapPayload(companyId: string, depotId: string, role: YardRole = "yard_manager"): BootstrapPayload {
  return {
    companyId,
    depotId,
    syncedAt: new Date().toISOString(),
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
  };
}

/** Back-fill fields missing from older IndexedDB bootstrap caches. */
export function normalizeBootstrapPayload(
  payload: Partial<BootstrapPayload> & Pick<BootstrapPayload, "companyId" | "depotId">,
  role: YardRole = "yard_manager",
): BootstrapPayload {
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
  };
}
