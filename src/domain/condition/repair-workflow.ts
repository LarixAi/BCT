import type { DamageRecord, RepairWorkOrder, RepairWorkOrderStatus } from "@/types/condition";

const TERMINAL: RepairWorkOrderStatus[] = ["completed", "cancelled"];

export function activeRepairOrdersForVehicle(
  orders: RepairWorkOrder[],
  vehicleId: string,
): RepairWorkOrder[] {
  return orders.filter(o => o.vehicleId === vehicleId && !TERMINAL.includes(o.status));
}

export function ordersAwaitingVerification(orders: RepairWorkOrder[]): RepairWorkOrder[] {
  return orders
    .filter(o => o.status === "awaiting_verification")
    .sort((a, b) => (b.completedAt ?? b.requestedAt).localeCompare(a.completedAt ?? a.requestedAt));
}

export function repairOrdersForDamage(orders: RepairWorkOrder[], damageId: string): RepairWorkOrder[] {
  return orders.filter(o => o.damageId === damageId && !TERMINAL.includes(o.status));
}

export function canStartRepair(order: RepairWorkOrder): boolean {
  return order.status === "open" || order.status === "scheduled";
}

export function canCompleteRepair(order: RepairWorkOrder): boolean {
  return order.status === "in_progress";
}

export function canVerifyRepair(order: RepairWorkOrder): boolean {
  return order.status === "awaiting_verification";
}

export function damageStatusAfterRepairStart(
  current: DamageRecord["status"],
): DamageRecord["status"] {
  if (["repaired", "closed"].includes(current)) return current;
  return "under_repair";
}

export function damageStatusAfterRepairComplete(
  current: DamageRecord["status"],
): DamageRecord["status"] {
  if (["repaired", "closed"].includes(current)) return current;
  return "awaiting_verification";
}

export function damageStatusAfterVerification(
  passed: boolean,
): DamageRecord["status"] {
  return passed ? "repaired" : "repair_required";
}
