import { describe, expect, it } from "vitest";
import type { Defect, VorCase } from "@/types/yard";
import { applyResolveDefect, canResolveDefect } from "@/domain/yard/defect-workflow";

const defect: Defect = {
  id: "df1",
  vehicleId: "v1",
  category: "Lights",
  severity: "Minor",
  notes: "Indicator fault",
  raisedAt: "2026-07-11T04:00:00Z",
  raisedBy: "Tester",
  resolved: false,
};

const openVor: VorCase = {
  id: "vor1",
  vehicleId: "v1",
  defectId: "df1",
  lifecycle: "Confirmed",
  reason: "Brake issue",
  openedAt: "2026-07-11T04:00:00Z",
  history: [],
};

describe("defect-workflow", () => {
  it("allows resolving open defects without VOR", () => {
    expect(canResolveDefect(defect).ok).toBe(true);
  });

  it("blocks resolve while linked VOR is open", () => {
    const linked = { ...defect, vorCaseId: "vor1" };
    const check = canResolveDefect(linked, openVor);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain("VOR");
  });

  it("allows resolve after VOR is cleared", () => {
    const linked = { ...defect, vorCaseId: "vor1" };
    const cleared = { ...openVor, lifecycle: "Cleared" as const };
    expect(canResolveDefect(linked, cleared).ok).toBe(true);
  });

  it("marks defect resolved with audit fields", () => {
    const resolved = applyResolveDefect(defect, "M. Fitter", "2026-07-11T06:00:00Z", "Bulb replaced");
    expect(resolved.resolved).toBe(true);
    expect(resolved.resolvedBy).toBe("M. Fitter");
    expect(resolved.resolutionNote).toBe("Bulb replaced");
  });
});
