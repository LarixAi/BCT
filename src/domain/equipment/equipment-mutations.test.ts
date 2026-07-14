import { describe, expect, it } from "vitest";
import { initialVehicleEquipment } from "@/data/equipment-fixtures";
import {
  applyAssignEquipment,
  applyClearEquipmentIssue,
  applyReportEquipmentIssue,
  applyRestockConsumable,
  applyUnassignEquipment,
} from "@/domain/equipment/equipment-mutations";

const meta = {
  vehicleId: "v1",
  at: "2026-07-11T05:00:00Z",
  by: "Tester",
  nextAuditId: () => "ea_test",
};

describe("equipment-mutations", () => {
  const eq = initialVehicleEquipment.v1;
  if (!eq) throw new Error("fixture missing v1 equipment");

  it("assigns equipment to a vehicle", () => {
    const result = applyAssignEquipment(eq, {
      id: "WCS-999",
      defId: "wheelchair-set",
      label: "Wheelchair set",
      status: "present",
    }, meta);
    expect(result?.equipment.assigned[0]?.id).toBe("WCS-999");
    expect(result?.audit.kind).toBe("assigned");
  });

  it("unassigns equipment", () => {
    const assigned = eq.assigned[0];
    if (!assigned) throw new Error("no assigned item");
    const result = applyUnassignEquipment(eq, assigned.id, "Returned", "Depot", meta);
    expect(result?.equipment.assigned.some(i => i.id === assigned.id)).toBe(false);
  });

  it("restocks consumables and decrements depot stock", () => {
    const line = eq.consumables[0];
    if (!line) throw new Error("no consumable");
    const result = applyRestockConsumable(eq, [
      { defId: line.defId, label: line.label, onHand: 20, unit: line.unit },
    ], line.defId, 2, meta);
    expect(result?.equipment.consumables.find(c => c.defId === line.defId)?.current).toBe(
      Math.min(line.target, line.current + 2),
    );
    expect(result?.depotStock[0]?.onHand).toBe(18);
  });

  it("reports and clears equipment issues", () => {
    const fixed = eq.fixed[0];
    if (!fixed) throw new Error("no fixed item");
    const reported = applyReportEquipmentIssue(eq, "fixed", fixed.id, "missing", "Not found", meta);
    expect(reported?.equipment.fixed.find(i => i.id === fixed.id)?.status).toBe("missing");

    const cleared = applyClearEquipmentIssue(reported!.equipment, "fixed", fixed.id, "Found", meta);
    expect(cleared?.equipment.fixed.find(i => i.id === fixed.id)?.status).toBe("present");
  });
});
