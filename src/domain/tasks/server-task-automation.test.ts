import { describe, expect, it } from "vitest";
import type { Defect, Vehicle, VorCase } from "@/types/yard";
import {
  buildServerDefectTaskPayload,
  buildServerVorTaskPayload,
  parseDefectIdFromTaskInstructions,
} from "@/domain/tasks/server-task-automation";

const vehicle: Vehicle = {
  id: "veh-1",
  reg: "AB12 CDE",
  bayId: "P01",
  status: "Available",
  fuelPct: 80,
  lastCheckPassed: true,
};

const defect: Defect = {
  id: "df_local_1",
  vehicleId: "veh-1",
  category: "Brakes",
  severity: "Safety-critical",
  notes: "Pressure warning",
  raisedAt: "2026-07-11T05:00:00Z",
  raisedBy: "Tester",
  resolved: false,
};

describe("server-task-automation", () => {
  it("parses defect ids from hub task instructions", () => {
    expect(
      parseDefectIdFromTaskInstructions("Driver-reported defect DEF-1 (a1b2c3d4-e5f6-4789-a012-3456789abcde)."),
    ).toBe("a1b2c3d4-e5f6-4789-a012-3456789abcde");
    expect(parseDefectIdFromTaskInstructions("Yard-reported defect (df_local_1). Notes")).toBe("df_local_1");
  });

  it("builds Command task.create payloads for defects and VOR", () => {
    const payload = buildServerDefectTaskPayload(defect, vehicle);
    expect(payload.taskType).toBe("quarantine_vehicle");
    expect(payload.priority).toBe("urgent");
    expect(payload.defectId).toBe("df_local_1");
    expect(payload.instructions).toContain("(df_local_1)");

    const vor: VorCase = {
      id: "vor_1",
      vehicleId: "veh-1",
      defectId: defect.id,
      reason: "Brake failure",
      lifecycle: "Open",
      history: [],
      openedAt: "2026-07-11T05:00:00Z",
    };
    const vorPayload = buildServerVorTaskPayload(vor, vehicle, defect);
    expect(vorPayload.priority).toBe("urgent");
    expect(vorPayload.instructions).toContain(defect.id);
  });
});
