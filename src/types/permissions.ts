export type YardRole =
  | "yard_operative"
  | "yard_manager"
  | "maintenance_user"
  | "operations_manager"
  | "company_administrator"
  | "read_only_auditor";

export type YardPermission =
  | "vehicle.view"
  | "vehicle.move"
  | "vehicle.mark_vor"
  | "vehicle.release_vor"
  | "check.complete"
  | "check.spot_audit"
  | "check.override"
  | "defect.resolve"
  | "equipment.assign"
  | "equipment.transfer"
  | "equipment.write_off"
  | "task.assign"
  | "handover.complete"
  | "incident.create"
  | "audit.view";

export const ROLE_PERMISSIONS: Record<YardRole, YardPermission[]> = {
  yard_operative: [
    "vehicle.view",
    "vehicle.move",
    "check.complete",
    "equipment.assign",
    "equipment.transfer",
    "handover.complete",
  ],
  yard_manager: [
    "vehicle.view",
    "vehicle.move",
    "vehicle.mark_vor",
    "vehicle.release_vor",
    "check.complete",
    "check.spot_audit",
    "check.override",
    "defect.resolve",
    "equipment.assign",
    "equipment.transfer",
    "task.assign",
    "handover.complete",
    "incident.create",
    "audit.view",
  ],
  maintenance_user: [
    "vehicle.view",
    "vehicle.mark_vor",
    "vehicle.release_vor",
    "check.complete",
    "defect.resolve",
    "equipment.assign",
    "audit.view",
  ],
  operations_manager: [
    "vehicle.view",
    "vehicle.move",
    "vehicle.mark_vor",
    "vehicle.release_vor",
    "check.complete",
    "check.spot_audit",
    "check.override",
    "defect.resolve",
    "equipment.assign",
    "equipment.transfer",
    "task.assign",
    "handover.complete",
    "incident.create",
    "audit.view",
  ],
  company_administrator: [
    "vehicle.view",
    "vehicle.move",
    "vehicle.mark_vor",
    "vehicle.release_vor",
    "check.complete",
    "check.spot_audit",
    "check.override",
    "defect.resolve",
    "equipment.assign",
    "equipment.transfer",
    "equipment.write_off",
    "task.assign",
    "handover.complete",
    "incident.create",
    "audit.view",
  ],
  read_only_auditor: ["vehicle.view", "audit.view"],
};
