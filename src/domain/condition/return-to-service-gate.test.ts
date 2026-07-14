import { describe, expect, it } from "vitest";
import { canReturnToService, getReturnToServiceBlockers } from "@/domain/condition/return-to-service-gate";
import type { DamageRecord, RepairWorkOrder } from "@/types/condition";
import type { Defect } from "@/types/yard";

const defects: Defect[] = [
  { id: "df1", vehicleId: "v6", category: "Brakes", severity: "Safety-critical", notes: "", raisedAt: "", raisedBy: "", resolved: false },
];

const repairs: RepairWorkOrder[] = [
  { id: "r1", vehicleId: "v6", status: "in_progress", description: "Brake line", requestedAt: "", requestedBy: "" },
];

const damage: DamageRecord[] = [];

describe("return-to-service-gate", () => {
  it("blocks when repairs are in progress", () => {
    const blockers = getReturnToServiceBlockers("v6", defects, repairs, damage);
    expect(canReturnToService(blockers)).toBe(false);
    expect(blockers.some(b => b.id === "repairs-active")).toBe(true);
  });

  it("blocks when safety defects remain open", () => {
    const blockers = getReturnToServiceBlockers("v6", defects, [], damage);
    expect(blockers.some(b => b.id === "safety-defects")).toBe(true);
  });

  it("allows release when repairs verified and defects resolved", () => {
    const blockers = getReturnToServiceBlockers("v6", [], [], damage);
    expect(canReturnToService(blockers)).toBe(true);
  });
});
