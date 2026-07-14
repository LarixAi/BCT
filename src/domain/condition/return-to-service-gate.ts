import { activeRepairOrdersForVehicle } from "@/domain/condition/repair-workflow";
import type { DamageRecord, RepairWorkOrder } from "@/types/condition";
import type { Defect, VorCase } from "@/types/yard";

export interface ReturnToServiceBlocker {
  id: string;
  label: string;
  detail: string;
  to?: string;
  params?: Record<string, string>;
}

export function getReturnToServiceBlockers(
  vehicleId: string,
  defects: Defect[],
  repairOrders: RepairWorkOrder[],
  damageRecords: DamageRecord[],
): ReturnToServiceBlocker[] {
  const blockers: ReturnToServiceBlocker[] = [];
  const active = activeRepairOrdersForVehicle(repairOrders, vehicleId);

  const inWorkshop = active.filter(o => ["open", "scheduled", "in_progress"].includes(o.status));
  if (inWorkshop.length > 0) {
    blockers.push({
      id: "repairs-active",
      label: `${inWorkshop.length} repair${inWorkshop.length > 1 ? "s" : ""} in progress`,
      detail: "Workshop work must be completed before return-to-service",
      to: "/yard/$vehicleId/condition",
      params: { vehicleId },
    });
  }

  const awaitingVerify = active.filter(o => o.status === "awaiting_verification");
  if (awaitingVerify.length > 0) {
    blockers.push({
      id: "repairs-verify",
      label: `${awaitingVerify.length} awaiting verification`,
      detail: "Post-repair inspection required before release",
      to: "/inspections/repair-verification",
    });
  }

  const damagePending = damageRecords.filter(
    d => d.vehicleId === vehicleId && d.status === "awaiting_verification",
  );
  if (damagePending.length > 0 && awaitingVerify.length === 0) {
    blockers.push({
      id: "damage-verify",
      label: "Damage verification outstanding",
      detail: "Confirm repaired areas with a post-repair inspection",
      to: "/inspections/repair-verification",
    });
  }

  const openSafety = defects.filter(
    d => d.vehicleId === vehicleId && !d.resolved && d.severity === "Safety-critical",
  );
  if (openSafety.length > 0) {
    blockers.push({
      id: "safety-defects",
      label: `${openSafety.length} safety defect${openSafety.length > 1 ? "s" : ""} open`,
      detail: "Safety-critical defects must be resolved or verified repaired",
      to: "/defects",
    });
  }

  return blockers;
}

export function canReturnToService(blockers: ReturnToServiceBlocker[]): boolean {
  return blockers.length === 0;
}

export function openVorCasesForVehicle(vorCases: VorCase[], vehicleId: string): VorCase[] {
  return vorCases.filter(c => c.vehicleId === vehicleId && c.lifecycle !== "Cleared");
}
