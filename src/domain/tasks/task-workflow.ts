import type { YardTask } from "@/types/tasks";

export function canAcceptTask(task: YardTask, userId: string | null | undefined): boolean {
  if (!userId || !["open", "assigned"].includes(task.status)) return false;
  if (task.status === "assigned" && task.assigneeId && task.assigneeId !== userId) return false;
  return true;
}

export function canCompleteTask(task: YardTask, userId: string | null | undefined): boolean {
  if (!userId || task.status !== "in_progress") return false;
  return !task.assigneeId || task.assigneeId === userId;
}

export function canAssignTask(task: YardTask): boolean {
  return task.status === "open" || task.status === "assigned";
}
