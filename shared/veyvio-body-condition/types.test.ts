import { describe, expect, it } from "vitest";
import { buildDamageReference, mapLegacyInspectionType } from "../../shared/veyvio-body-condition/types.ts";

describe("veyvio-body-condition types", () => {
  it("builds damage reference numbers", () => {
    expect(buildDamageReference(2026, 481, 3)).toBe("BD-2026-00481-03");
    expect(buildDamageReference(2026, 1, 1)).toBe("BD-2026-00001-01");
  });

  it("maps legacy yard inspection types to canonical codes", () => {
    expect(mapLegacyInspectionType("onboarding-baseline")).toBe("initial_baseline");
    expect(mapLegacyInspectionType("return-to-yard")).toBe("end_shift_return");
    expect(mapLegacyInspectionType("unknown-type")).toBe("other");
  });
});
