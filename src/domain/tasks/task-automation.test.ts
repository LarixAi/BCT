import { describe, expect, it } from "vitest";
import type { Defect, Trip, Vehicle } from "@/types/yard";
import type { YardTask } from "@/types/tasks";
import {
  buildBlockedTripTask,
  buildDefectTask,
  hasOpenDefectTask,
  hasOpenTaskForTrip,
  mergeAutomatedTasks,
  parseTaskScanRef,
  pickBoardTasks,
  tasksFromBlockedTrips,
} from "@/domain/tasks/task-automation";

const nextId = (p: string) => `${p}_test`;

const vehicle: Vehicle = {
  id: "v1",
  reg: "AB12 CDE",
  bayId: "P01",
  status: "Available",
  fuelPct: 80,
  lastCheckPassed: true,
};

const defect: Defect = {
  id: "df_test",
  vehicleId: "v1",
  category: "Brakes",
  severity: "Safety-critical",
  notes: "Pressure warning",
  raisedAt: "2026-07-11T05:00:00Z",
  raisedBy: "Tester",
  resolved: false,
};

describe("task-automation", () => {
  it("builds urgent defect tasks", () => {
    const task = buildDefectTask(defect, vehicle, "System", nextId);
    expect(task.priority).toBe("Urgent");
    expect(task.kind).toBe("defect");
    expect(task.defectId).toBe(defect.id);
    expect(task.dueAt).toBeDefined();
  });

  it("dedupes open tasks for the same defect or trip", () => {
    const existing: YardTask[] = [{
      id: "task_existing",
      title: "Existing",
      kind: "defect",
      priority: "High",
      status: "open",
      defectId: "df_test",
      createdAt: "2026-07-11T05:00:00Z",
      createdBy: "System",
    }];
    const incoming = [buildDefectTask(defect, vehicle, "System", nextId)];
    const merged = mergeAutomatedTasks(existing, incoming);
    expect(merged.tasks).toHaveLength(1);
    expect(merged.added).toHaveLength(0);
    expect(hasOpenDefectTask(existing, "df_test")).toBe(true);
  });

  it("creates blocked trip tasks once per trip", () => {
    const trips: Trip[] = [{
      id: "t9",
      code: "R999",
      service: "Test",
      departAt: "07:30",
      vehicleId: "v1",
      driverId: "d1",
      ready: false,
      blockers: ["Check missing", "Fuel low"],
    }];
    const created = tasksFromBlockedTrips(trips, [vehicle], [], "System", nextId);
    expect(created).toHaveLength(1);
    expect(created[0]?.kind).toBe("check");
    expect(hasOpenTaskForTrip(created, "t9")).toBe(true);
    expect(tasksFromBlockedTrips(trips, [vehicle], created, "System", nextId)).toHaveLength(0);
  });

  it("skips ready trips", () => {
    const trip: Trip = {
      id: "t_ok",
      code: "R100",
      service: "OK",
      departAt: "08:00",
      ready: true,
      blockers: [],
    };
    expect(buildBlockedTripTask(trip, vehicle, "System", nextId)).toBeNull();
  });

  it("parses task scan references", () => {
    expect(parseTaskScanRef("task:task_1")).toBe("task_1");
    expect(parseTaskScanRef("veyvio:task:task_2")).toBe("task_2");
    expect(parseTaskScanRef("TASK-task_3")).toBe("task_3");
    expect(parseTaskScanRef("AB12 CDE")).toBeNull();
  });

  it("prioritises in-progress tasks for the current user on the board", () => {
    const tasks: YardTask[] = [
      {
        id: "t_open",
        title: "Open",
        kind: "general",
        priority: "Normal",
        status: "open",
        createdAt: "2026-07-11T04:00:00Z",
        createdBy: "A",
      },
      {
        id: "t_mine",
        title: "Mine",
        kind: "check",
        priority: "Normal",
        status: "in_progress",
        assigneeId: "usr_me",
        createdAt: "2026-07-11T04:00:00Z",
        createdBy: "A",
      },
    ];
    const board = pickBoardTasks(tasks, "usr_me", 1);
    expect(board[0]?.id).toBe("t_mine");
  });
});
