import type { AdBlueRefillRecord } from "@/types/fluids";
import type { OperationalDayPlan } from "@/types/plan";
import type { YardHubLayoutSnapshot } from "@veyvio/yard";
import type { YardTask } from "@/types/tasks";
import type {
  Bay,
  Defect,
  DepartureRelease,
  Movement,
  ShiftHandover,
  Trip,
  Vehicle,
  VorCase,
} from "@/types/yard";
import type { StockLine, VehicleEquipment, EquipmentAuditEvent } from "@/types/equipment";
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
import type { YardCheckResult } from "@/types/yard-check";
import type { BootstrapDataSource } from "@/data/mocks/bootstrap";

/** Operational store fields with no demo fleet — used on first paint and after tenant switch. */
export function createEmptyYardCoreState(): {
  bays: Bay[];
  vehicles: Vehicle[];
  trips: Trip[];
  defects: Defect[];
  vorCases: VorCase[];
  movements: Movement[];
  adblueRefills: AdBlueRefillRecord[];
  yardChecks: YardCheckResult[];
  equipment: Record<string, VehicleEquipment>;
  equipmentAudit: EquipmentAuditEvent[];
  depotStock: StockLine[];
  departureReleases: DepartureRelease[];
  handovers: ShiftHandover[];
  tasks: YardTask[];
  sheet: null;
  conditionProfiles: Record<string, VehicleConditionProfile>;
  inspections: VehicleInspection[];
  inspectionMedia: InspectionMedia[];
  damageRecords: DamageRecord[];
  damageObservations: DamageObservation[];
  damageReviews: DamageReview[];
  conditionSnapshots: VehicleConditionSnapshot[];
  custodyTimeline: CustodyEvent[];
  repairWorkOrders: RepairWorkOrder[];
  operationalPlan: OperationalDayPlan | null;
  depotCode: string | null;
  yardMapEnabled: boolean;
  yardLayout: YardHubLayoutSnapshot | null;
  dataSource: BootstrapDataSource | null;
  hydrated: boolean;
} {
  return {
    bays: [],
    vehicles: [],
    trips: [],
    defects: [],
    vorCases: [],
    movements: [],
    adblueRefills: [],
    yardChecks: [],
    equipment: {},
    equipmentAudit: [],
    depotStock: [],
    departureReleases: [],
    handovers: [],
    tasks: [],
    sheet: null,
    conditionProfiles: {},
    inspections: [],
    inspectionMedia: [],
    damageRecords: [],
    damageObservations: [],
    damageReviews: [],
    conditionSnapshots: [],
    custodyTimeline: [],
    repairWorkOrders: [],
    operationalPlan: null,
    depotCode: null,
    yardMapEnabled: false,
    yardLayout: null,
    dataSource: null,
    hydrated: false,
  };
}
