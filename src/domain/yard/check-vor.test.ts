import { describe, expect, it } from "vitest";
import { sectionsRequiringVor, shouldAutoVorFromSection } from "@/domain/yard/check-vor";
import type { YardCheckSectionResult } from "@/types/yard-check";

describe("check-vor", () => {
  it("requires VOR for safety-critical unsafe defects", () => {
    const section: YardCheckSectionResult = {
      sectionId: "brakes-air",
      title: "Brakes",
      outcome: "defect",
      safeToMove: false,
    };
    expect(shouldAutoVorFromSection(section)).toBe(true);
  });

  it("does not require VOR when vehicle is safe to move", () => {
    const section: YardCheckSectionResult = {
      sectionId: "brakes-air",
      title: "Brakes",
      outcome: "defect",
      safeToMove: true,
    };
    expect(shouldAutoVorFromSection(section)).toBe(false);
  });

  it("does not require VOR for non-safety consumables", () => {
    const section: YardCheckSectionResult = {
      sectionId: "consumables",
      title: "Consumables",
      outcome: "defect",
      safeToMove: false,
    };
    expect(shouldAutoVorFromSection(section)).toBe(false);
    expect(sectionsRequiringVor([section])).toHaveLength(0);
  });
});
