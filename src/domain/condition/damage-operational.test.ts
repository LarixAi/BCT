import { describe, expect, it } from "vitest";
import {
  defectCategoryForDamageType,
  operationalDecisionForDamage,
  severityToDefect,
} from "@/domain/condition/damage-operational";
import type { DamageRecord } from "@/types/condition";

const base: Pick<DamageRecord, "severity" | "damageType" | "operationalImpact"> = {
  severity: "cosmetic",
  damageType: "scratch",
};

describe("damage-operational", () => {
  it("recommends monitored availability for cosmetic damage", () => {
    const d = operationalDecisionForDamage(base);
    expect(d.status).toBe("available_monitored");
    expect(d.recommendVor).toBeFalsy();
    expect(d.defectSeverity).toBe("Minor");
  });

  it("recommends VOR for safety-critical glass damage", () => {
    const d = operationalDecisionForDamage({
      severity: "safety_critical",
      damageType: "glass_damage",
    });
    expect(d.recommendVor).toBe(true);
    expect(d.vehicleStatus).toBe("VOR");
    expect(d.defectSeverity).toBe("Safety-critical");
  });

  it("flags operational damage as restricted", () => {
    const d = operationalDecisionForDamage({
      severity: "operational",
      damageType: "dent",
    });
    expect(d.status).toBe("restricted");
    expect(d.defectSeverity).toBe("Major");
  });

  it("maps damage types to defect categories", () => {
    expect(defectCategoryForDamageType("broken_light")).toBe("Lights");
    expect(defectCategoryForDamageType("scratch")).toBe("Bodywork");
  });

  it("maps severity to defect severity", () => {
    expect(severityToDefect("safety_critical")).toBe("Safety-critical");
    expect(severityToDefect("cosmetic")).toBe("Minor");
  });
});
