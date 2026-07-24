import type { YardTask } from "@/types/tasks";

export function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getUserDisplayName(user: {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null | undefined): string {
  if (!user) return "";
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return full || user.email || "";
}

export function taskAssigneeMatchesUser(
  task: YardTask,
  userId: string | null | undefined,
  userName?: string | null,
): boolean {
  if (!task.assigneeId && !task.assigneeName) return true;
  if (task.assigneeId && userId && task.assigneeId === userId) return true;
  if (!task.assigneeName || !userName) return false;
  const assignee = normalizePersonName(task.assigneeName);
  const user = normalizePersonName(userName);
  if (!assignee || !user) return false;
  return assignee === user || assignee.includes(user) || user.includes(assignee);
}

export function canAcceptTask(
  task: YardTask,
  userId: string | null | undefined,
  userName?: string | null,
): boolean {
  if (!userId || !["open", "assigned"].includes(task.status)) return false;
  if (task.status === "assigned" && (task.assigneeId || task.assigneeName)) {
    return taskAssigneeMatchesUser(task, userId, userName);
  }
  return true;
}

export function canCompleteTask(
  task: YardTask,
  userId: string | null | undefined,
  userName?: string | null,
): boolean {
  if (!userId || task.status !== "in_progress") return false;
  return taskAssigneeMatchesUser(task, userId, userName);
}

export function canAssignTask(task: YardTask): boolean {
  return task.status === "open" || task.status === "assigned";
}

export function isTaskAssignedToUser(
  task: YardTask,
  userId: string | null | undefined,
  userName?: string | null,
): boolean {
  if (!task.assigneeId && !task.assigneeName) return false;
  return taskAssigneeMatchesUser(task, userId, userName);
}
