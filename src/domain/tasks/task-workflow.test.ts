import { describe, expect, it } from "vitest";
import type { YardTask } from "@/types/tasks";
import {
  canAcceptTask,
  canCompleteTask,
  getUserDisplayName,
  isTaskAssignedToUser,
  taskAssigneeMatchesUser,
} from "./task-workflow";

function task(overrides: Partial<YardTask> = {}): YardTask {
  return {
    id: "task-1",
    title: "Refuel vehicle",
    kind: "move",
    status: "assigned",
    priority: "Normal",
    createdAt: "2026-07-24T08:00:00.000Z",
    createdBy: "Admin",
    assigneeName: "kenny laing",
    ...overrides,
  };
}

describe("task-workflow", () => {
  it("matches assignee by display name", () => {
    expect(taskAssigneeMatchesUser(task(), "usr-1", "Kenny Laing")).toBe(true);
    expect(taskAssigneeMatchesUser(task(), "usr-1", "Other User")).toBe(false);
  });

  it("matches assignee by id when present", () => {
    const byId = task({ assigneeId: "usr-kenny", assigneeName: "Kenny Laing" });
    expect(taskAssigneeMatchesUser(byId, "usr-kenny", "Someone Else")).toBe(true);
  });

  it("allows accept when assigned to current user", () => {
    expect(canAcceptTask(task(), "usr-1", "kenny laing")).toBe(true);
    expect(canAcceptTask(task(), "usr-1", "other person")).toBe(false);
  });

  it("allows complete only when in progress and assigned to user", () => {
    const inProgress = task({ status: "in_progress", assigneeId: "usr-1" });
    expect(canCompleteTask(inProgress, "usr-1", "kenny laing")).toBe(true);
    expect(canCompleteTask(task(), "usr-1", "kenny laing")).toBe(false);
  });

  it("detects tasks assigned to the signed-in user", () => {
    expect(isTaskAssignedToUser(task(), "usr-1", "Kenny Laing")).toBe(true);
    expect(isTaskAssignedToUser(task({ assigneeName: undefined }), "usr-1", "Kenny Laing")).toBe(false);
  });

  it("builds display name from session user", () => {
    expect(getUserDisplayName({ firstName: "Kenny", lastName: "Laing", email: "k@x.com" })).toBe(
      "Kenny Laing",
    );
    expect(getUserDisplayName({ email: "k@x.com" })).toBe("k@x.com");
  });
});
