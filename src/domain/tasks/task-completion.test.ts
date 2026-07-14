import { describe, expect, it } from "vitest";
import type { YardTask } from "@/types/tasks";
import type { Trip } from "@/types/yard";
import {
  applyAutoTaskCompletions,
  applyReadyTripTaskCompletions,
  taskIdsToAutoComplete,
} from "@/domain/tasks/task-completion";

const base: YardTask = {
  id: "t1",
  title: "Task",
  kind: "check",
  priority: "High",
  status: "open",
  vehicleId: "v3",
  tripId: "trip1",
  createdAt: "2026-07-11T04:00:00Z",
  createdBy: "System",
};

describe("task-completion", () => {
  it("auto-completes check tasks when a yard check passes", () => {
    const ids = taskIdsToAutoComplete([base], { type: "check_passed", vehicleId: "v3" });
    expect(ids).toEqual(["t1"]);
  });

  it("auto-completes trip tasks when a departure is released", () => {
    const task: YardTask = { ...base, kind: "move", id: "t2" };
    const ids = taskIdsToAutoComplete([task], { type: "trip_released", tripId: "trip1" });
    expect(ids).toEqual(["t2"]);
  });

  it("auto-completes blocker tasks when a trip becomes ready", () => {
    const tasks: YardTask[] = [
      { ...base, id: "check", kind: "check" },
      { ...base, id: "move", kind: "move" },
    ];
    const trips: Trip[] = [{
      id: "trip1",
      code: "R1",
      service: "Test",
      departAt: "07:00",
      ready: true,
      blockers: [],
    }];
    const { completed } = applyReadyTripTaskCompletions(tasks, trips, "System", "2026-07-11T05:00:00Z");
    expect(completed.map(t => t.id)).toEqual(["move"]);
  });

  it("auto-completes inspection tasks when VOR is cleared", () => {
    const task: YardTask = {
      ...base,
      id: "insp",
      kind: "inspection",
      defectId: "df1",
    };
    const { completed } = applyAutoTaskCompletions(
      [task],
      [{ type: "vor_cleared", vehicleId: "v3", defectId: "df1" }],
      "System",
      "2026-07-11T05:00:00Z",
    );
    expect(completed[0]?.status).toBe("completed");
    expect(completed[0]?.completionNote).toContain("Auto-closed");
  });

  it("auto-completes defect tasks when a defect is resolved", () => {
    const task: YardTask = {
      ...base,
      id: "defect-task",
      kind: "defect",
      defectId: "df9",
    };
    const ids = taskIdsToAutoComplete([task], { type: "defect_resolved", defectId: "df9" });
    expect(ids).toEqual(["defect-task"]);
  });
});
