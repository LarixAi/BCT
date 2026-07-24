export type UpcomingCategory =
  | "mot"
  | "safety_inspection"
  | "servicing"
  | "tyre"
  | "wheel_nut_retorque"
  | "weekly_check"
  | "inactive_vehicle"
  | "yard_task"
  | "defect"
  | "equipment"
  | "document"
  | "other";

export type UpcomingPriority = "critical" | "urgent" | "upcoming" | "planned";

export type UpcomingBucket = "overdue" | "today" | "week" | "month";

export type UpcomingExecution = "yard_team" | "external_garage" | "authorised_inspector";

export interface UpcomingItem {
  id: string;
  category: UpcomingCategory;
  title: string;
  subtitle?: string;
  detailLines: string[];
  vehicleId?: string;
  vehicleReg?: string;
  bayId?: string;
  dueAt?: string;
  dueMileage?: number;
  currentMileage?: number;
  priority: UpcomingPriority;
  bucket: UpcomingBucket;
  statusLabel: string;
  execution: UpcomingExecution;
  blocksAllocation: boolean;
  evidenceMissing: boolean;
  needsBooking: boolean;
  yardTaskId?: string;
  defectId?: string;
  source: "task" | "defect" | "vehicle" | "compliance_rule" | "inactivity";
}

export const UPCOMING_CATEGORY_LABELS: Record<UpcomingCategory, string> = {
  mot: "MOT",
  safety_inspection: "Safety inspection",
  servicing: "Servicing",
  tyre: "Tyre replacement",
  wheel_nut_retorque: "Wheel-nut re-torque",
  weekly_check: "Weekly vehicle check",
  inactive_vehicle: "Inactive vehicle check",
  yard_task: "Yard task",
  defect: "Defect follow-up",
  equipment: "Equipment",
  document: "Document expiry",
  other: "Other",
};
