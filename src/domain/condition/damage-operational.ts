import type { DamageRecord, DamageSeverity } from "@/types/condition";
import type { DefectSeverity, VehicleStatus } from "@/types/yard";

export type DamageOperationalStatus =
  | "available"
  | "available_monitored"
  | "restricted"
  | "inspection_required"
  | "maintenance_required"
  | "vor_recommended";

export interface DamageOperationalDecision {
  status: DamageOperationalStatus;
  reason: string;
  defectSeverity?: DefectSeverity;
  recommendVor?: boolean;
  vehicleStatus?: VehicleStatus;
}

export function operationalDecisionForDamage(
  record: Pick<DamageRecord, "severity" | "damageType" | "operationalImpact">,
  safeToOperate = true,
): DamageOperationalDecision {
  if (record.severity === "safety_critical" || !safeToOperate) {
    const glassOrLight = ["glass_damage", "broken_light", "broken_mirror"].includes(record.damageType);
    return {
      status: "vor_recommended",
      reason: glassOrLight
        ? "Safety-critical damage affecting visibility or roadworthiness"
        : "Safety-critical damage — vehicle should not dispatch until reviewed",
      defectSeverity: "Safety-critical",
      recommendVor: true,
      vehicleStatus: "VOR",
    };
  }
  if (record.severity === "operational" || record.operationalImpact) {
    return {
      status: "restricted",
      reason: "Operational damage may affect service delivery or passenger access",
      defectSeverity: "Major",
      recommendVor: false,
      vehicleStatus: "Awaiting Check",
    };
  }
  return {
    status: "available_monitored",
    reason: "Cosmetic damage recorded — vehicle may continue with monitored damage",
    defectSeverity: "Minor",
    recommendVor: false,
  };
}

export function defectCategoryForDamageType(damageType: DamageRecord["damageType"]): string {
  const map: Partial<Record<DamageRecord["damageType"], string>> = {
    broken_light: "Lights",
    broken_mirror: "Lights",
    glass_damage: "Bodywork",
    impact_damage: "Bodywork",
    dent: "Bodywork",
    scratch: "Bodywork",
    scuff: "Bodywork",
  };
  return map[damageType] ?? "Bodywork";
}

export function severityToDefect(severity: DamageSeverity): DefectSeverity {
  if (severity === "safety_critical") return "Safety-critical";
  if (severity === "operational") return "Major";
  return "Minor";
}
