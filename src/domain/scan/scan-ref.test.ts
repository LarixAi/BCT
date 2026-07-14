import { describe, expect, it } from "vitest";
import { parseScanEntityRef, resolveScanTarget } from "@/domain/scan/scan-ref";

const ctx = {
  vehicles: [{ id: "v3", reg: "MX72 BVK", bayId: "D01" }],
  defects: [{ id: "df3" }],
  tasks: [{ id: "task_1", title: "T", kind: "general" as const, priority: "Normal" as const, status: "open" as const, createdAt: "", createdBy: "" }],
  bays: [{ id: "D01", zone: "Departure Line" as const }],
};

describe("scan-ref", () => {
  it("parses veyvio entity refs", () => {
    expect(parseScanEntityRef("veyvio:defect:df3")).toEqual({ kind: "defect", id: "df3" });
    expect(parseScanEntityRef("task:task_1")).toEqual({ kind: "task", id: "task_1" });
  });

  it("resolves defect and vehicle targets", () => {
    expect(resolveScanTarget("defect:df3", ctx)).toEqual({
      to: "/defects/$defectId",
      params: { defectId: "df3" },
    });
    expect(resolveScanTarget("MX72 BVK", ctx)?.params?.vehicleId).toBe("v3");
  });
});
