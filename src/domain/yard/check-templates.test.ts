import { describe, expect, it } from "vitest";
import { DVSA_SECTIONS, dvsaGroupCount, getSectionsForCheckType } from "@/domain/yard/check-templates";
import { computeOverallPassed, computeSafetyOutcome } from "@/domain/yard/check-outcome";
import type { YardCheckSectionResult } from "@/types/yard-check";

describe("check-templates", () => {
  it("defines 29 DVSA roadworthiness groups", () => {
    expect(dvsaGroupCount()).toBe(29);
    expect(DVSA_SECTIONS.every(s => s.dvsaGroup)).toBe(true);
  });

  it("returns full template for start-of-day", () => {
    const sections = getSectionsForCheckType("start-of-day");
    expect(sections.length).toBeGreaterThan(40);
  });

  it("returns targeted sections for between-run checks", () => {
    const sections = getSectionsForCheckType("between-run");
    expect(sections.some(s => s.id === "tyres-wheels")).toBe(true);
    expect(sections.some(s => s.id === "ticket-machine")).toBe(false);
  });

  it("returns full manager audit with spot-bust sections", () => {
    const sections = getSectionsForCheckType("yard-spot");
    expect(sections.some(s => s.id === "audit-tyres")).toBe(true);
    expect(sections.some(s => s.id === "audit-bodywork")).toBe(true);
    expect(sections.some(s => s.id === "tyres-wheels")).toBe(true);
    expect(sections.length).toBeGreaterThan(35);
  });
});

describe("check-outcome", () => {
  it("marks safety-critical unsafe defects as VOR", () => {
    const sections: YardCheckSectionResult[] = [{
      sectionId: "brakes-air",
      title: "Brakes",
      outcome: "defect",
      safeToMove: false,
    }];
    expect(computeSafetyOutcome(sections)).toBe("vor");
  });

  it("passes when all sections passed or N/A", () => {
    const sections: YardCheckSectionResult[] = [
      { sectionId: "horn", title: "Horn", outcome: "passed" },
      { sectionId: "ticket-machine", title: "ETM", outcome: "na" },
    ];
    expect(computeOverallPassed(sections)).toBe(true);
    expect(computeSafetyOutcome(sections)).toBe("ready");
  });
});
