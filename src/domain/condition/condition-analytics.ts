import { getConditionProfile, pendingDamageReviews, vehicleNeedsBaseline } from "@/domain/condition/condition-helpers";
import { activeRepairOrdersForVehicle, ordersAwaitingVerification } from "@/domain/condition/repair-workflow";
import type {
  ConditionAnalyticsSummary,
  DamageObservation,
  DamageRecord,
  DamageReview,
  RepairWorkOrder,
  VehicleConditionProfile,
  VehicleInspection,
} from "@/types/condition";
import type { Vehicle } from "@/types/yard";

export function buildConditionAnalytics(input: {
  vehicles: Vehicle[];
  damageRecords: DamageRecord[];
  observations: DamageObservation[];
  reviews: DamageReview[];
  repairOrders: RepairWorkOrder[];
  profiles: Record<string, VehicleConditionProfile>;
  inspections: VehicleInspection[];
}): ConditionAnalyticsSummary {
  const openDamage = input.damageRecords.filter(d => !["repaired", "closed"].includes(d.status));
  const pendingReview = pendingDamageReviews(input.observations, input.reviews);
  const unreportedNew = pendingReview.filter(o => o.classification === "new_not_reported");

  const bySeverity = { cosmetic: 0, operational: 0, safety_critical: 0 } as Record<
    DamageRecord["severity"],
    number
  >;
  for (const d of openDamage) bySeverity[d.severity]++;

  const zoneCounts = new Map<string, number>();
  for (const d of openDamage) {
    zoneCounts.set(d.zoneId, (zoneCounts.get(d.zoneId) ?? 0) + 1);
  }
  const topDamageZones = [...zoneCounts.entries()]
    .map(([zoneId, count]) => ({ zoneId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const perVehicle = new Map<string, number>();
  for (const d of openDamage) {
    perVehicle.set(d.vehicleId, (perVehicle.get(d.vehicleId) ?? 0) + 1);
  }
  const vehiclesWithRecurringDamage = [...perVehicle.entries()]
    .filter(([, count]) => count >= 2)
    .map(([vehicleId, count]) => ({ vehicleId, count }))
    .sort((a, b) => b.count - a.count);

  const missingBaselineCount = input.vehicles.filter(
    v => vehicleNeedsBaseline(getConditionProfile(input.profiles, v.id)),
  ).length;

  let activeRepairCount = 0;
  for (const v of input.vehicles) {
    activeRepairCount += activeRepairOrdersForVehicle(input.repairOrders, v.id).length;
  }

  const riskAlerts: ConditionAnalyticsSummary["riskAlerts"] = [];
  if (bySeverity.safety_critical > 0) {
    riskAlerts.push({
      id: "safety-damage",
      label: `${bySeverity.safety_critical} safety-critical damage`,
      detail: "Open damage affecting roadworthiness or passenger safety",
      tone: "vor",
    });
  }
  if (unreportedNew.length > 0) {
    riskAlerts.push({
      id: "unreported",
      label: `${unreportedNew.length} unreviewed new reports`,
      detail: "Possible unreported damage awaiting Yard triage",
      tone: "warn",
    });
  }
  if (ordersAwaitingVerification(input.repairOrders).length > 0) {
    riskAlerts.push({
      id: "verify-backlog",
      label: `${ordersAwaitingVerification(input.repairOrders).length} repairs awaiting verification`,
      detail: "Vehicles may remain restricted until post-repair inspection",
      tone: "warn",
    });
  }
  if (missingBaselineCount > 0) {
    riskAlerts.push({
      id: "baseline-gap",
      label: `${missingBaselineCount} vehicles without baseline`,
      detail: "Cannot reliably compare new damage without approved onboarding",
      tone: "warn",
    });
  }

  return {
    openDamageCount: openDamage.length,
    openDamageBySeverity: bySeverity,
    pendingReviewCount: pendingReview.length,
    unreportedNewCount: unreportedNew.length,
    awaitingVerificationCount: ordersAwaitingVerification(input.repairOrders).length,
    missingBaselineCount,
    activeRepairCount,
    topDamageZones,
    vehiclesWithRecurringDamage,
    riskAlerts,
  };
}
