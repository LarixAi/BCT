/** Published operational day plan — Admin → Yard (and Driver) projection. */

export type OperationalDayPlanStatus = "draft" | "published" | "superseded" | "acknowledged";

export interface PlanDutyRow {
  dutyId: string;
  reference: string;
  startTime: string;
  routeName: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleReg?: string;
}

/** Ordered staging intent for the yard before service. */
export interface YardStagingItem {
  sequence: number;
  vehicleId: string;
  vehicleReg: string;
  dutyId?: string;
  tripCode?: string;
  departAt: string;
  targetBayId?: string;
  instructions?: string;
}

export interface OperationalDayPlan {
  id: string;
  companyId: string;
  depotId: string;
  operationalDate: string;
  version: number;
  status: OperationalDayPlanStatus;
  publishedAt?: string;
  publishedBy?: string;
  duties: PlanDutyRow[];
  staging: YardStagingItem[];
  notes?: string;
}
