/**
 * Live yard bootstrap contract — production modules must import from here,
 * not from `@/data/mocks/bootstrap` (F-03 Gate 3).
 */
import type { YardHubLayoutSnapshot } from "@veyvio/yard";
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
import type { StockLine, VehicleEquipment } from "@/types/equipment";
import type { AdBlueRefillRecord } from "@/types/fluids";
import type { OperationalDayPlan } from "@/types/plan";
import { ROLE_PERMISSIONS, type YardRole } from "@/types/permissions";
import type { YardTask } from "@/types/tasks";
import type { YardCheckResult } from "@/types/yard-check";
import type { Bay, Defect, Movement, Trip, Vehicle, VorCase } from "@/types/yard";

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
  vehicles: Vehicle[];
  bays: Bay[];
  trips: Trip[];
  defects: Defect[];
  vorCases: VorCase[];
  movements: Movement[];
  yardChecks: YardCheckResult[];
  equipment: Record<string, VehicleEquipment>;
  depotStock: StockLine[];
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
  adblueRefills: AdBlueRefillRecord[];
  operationalPlan: OperationalDayPlan | null;
}

/** Live Command hub — structural shell only; no demo fleet, trips, or plan. */
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
    bays: [],
    trips: [],
    defects: [],
    vorCases: [],
    movements: [],
    yardChecks: [],
    equipment: {},
    depotStock: [],
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
    yardMapEnabled: false,
    yardLayout: null,
  };
}

/**
 * Normalize live / command-hub bootstrap caches.
 * Does not invent demo fleet, tasks, or operational plan (F-03).
 */
export function normalizeLiveBootstrapPayload(
  payload: Partial<BootstrapPayload> & Pick<BootstrapPayload, "companyId" | "depotId">,
  role: YardRole = "yard_manager",
): BootstrapPayload {
  const shell = buildLiveBootstrapShell(payload.companyId, payload.depotId, role);
  return {
    ...shell,
    ...payload,
    dataSource: COMMAND_HUB_BOOTSTRAP_SOURCE,
    schemaVersion: payload.schemaVersion ?? BOOTSTRAP_SCHEMA_VERSION,
    permissions: payload.permissions ?? shell.permissions,
    bays: payload.bays ?? [],
    vehicles: payload.vehicles ?? [],
    trips: payload.trips ?? [],
    defects: payload.defects ?? [],
    vorCases: payload.vorCases ?? [],
    movements: payload.movements ?? [],
    yardChecks: payload.yardChecks ?? [],
    equipment: payload.equipment ?? {},
    depotStock: payload.depotStock ?? [],
    tasks: payload.tasks ?? [],
    operationalPlan: payload.operationalPlan === undefined ? null : payload.operationalPlan,
  };
}
