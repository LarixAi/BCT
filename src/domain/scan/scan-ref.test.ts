import { describe, expect, it } from "vitest";
import { parseScanEntityRef, resolveScanTarget } from "@/domain/scan/scan-ref";
import { initialVehicleEquipment } from "@/data/equipment-fixtures";

const ctx = {
  vehicles: [{ id: "v3", reg: "MX72 BVK", bayId: "D01" }, { id: "v1", reg: "SK23 FGH", bayId: "A01" }],
  defects: [{ id: "df3" }],
  tasks: [{ id: "task_1", title: "T", kind: "general" as const, priority: "Normal" as const, status: "open" as const, createdAt: "", createdBy: "" }],
  bays: [{ id: "D01", zone: "Departure Line" as const }],
  equipment: initialVehicleEquipment,
};

describe("scan-ref", () => {
  it("parses veyvio entity refs", () => {
    expect(parseScanEntityRef("veyvio:defect:df3")).toEqual({ kind: "defect", id: "df3" });
    expect(parseScanEntityRef("task:task_1")).toEqual({ kind: "task", id: "task_1" });
    expect(parseScanEntityRef("veyvio:equipment:EQ-HV-1")).toEqual({ kind: "equipment", id: "EQ-HV-1" });
  });

  it("resolves equipment scan to transfer action", () => {
    const assigned = initialVehicleEquipment.v1?.assigned[0];
    if (!assigned) throw new Error("missing assigned fixture");
    const code = assigned.qrCode ?? assigned.id;
    const target = resolveScanTarget(`veyvio:equipment:${code}`, ctx);
    expect(target?.to).toBe("/yard/$vehicleId/equipment");
    expect(target?.params?.vehicleId).toBe("v1");
    expect(target?.action).toEqual({
      type: "transfer-equipment",
      vehicleId: "v1",
      itemId: assigned.id,
    });
  });

  it("resolves defect and vehicle targets", () => {
    expect(resolveScanTarget("defect:df3", ctx)).toEqual({
      to: "/defects/$defectId",
      params: { defectId: "df3" },
    });
    expect(resolveScanTarget("MX72 BVK", ctx)?.params?.vehicleId).toBe("v3");
  });
});
