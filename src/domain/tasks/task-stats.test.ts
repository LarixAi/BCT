import { describe, expect, it } from "vitest";
import { initialTasks } from "@/data/tasks-fixtures";
import { taskStats } from "@/domain/tasks/task-stats";

describe("task-stats", () => {
  it("counts open and urgent tasks", () => {
    const stats = taskStats(initialTasks);
    expect(stats.open).toBeGreaterThan(0);
    expect(stats.urgent).toBeGreaterThan(0);
  });

  it("counts tasks assigned to current user", () => {
    const stats = taskStats(initialTasks, "usr_j.miller");
    expect(stats.mine).toBeGreaterThan(0);
  });
});
