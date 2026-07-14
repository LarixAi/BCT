import { isTaskOpen } from "@/domain/tasks/task-stats";
import type { Trip } from "@/types/yard";
import type { YardTask } from "@/types/tasks";

export type TaskCompletionTrigger =
  | { type: "check_passed"; vehicleId: string }
  | { type: "trip_released"; tripId: string }
  | { type: "vor_cleared"; vehicleId: string; defectId?: string }
  | { type: "defect_resolved"; defectId: string };

const AUTO_NOTE = "Auto-closed when related yard work was completed.";

export function taskIdsToAutoComplete(tasks: YardTask[], trigger: TaskCompletionTrigger): string[] {
  return tasks
    .filter(t => isTaskOpen(t) && matchesTrigger(t, trigger))
    .map(t => t.id);
}

function matchesTrigger(task: YardTask, trigger: TaskCompletionTrigger): boolean {
  switch (trigger.type) {
    case "check_passed":
      return task.kind === "check" && task.vehicleId === trigger.vehicleId;
    case "trip_released":
      return !!task.tripId && task.tripId === trigger.tripId;
    case "vor_cleared":
      if (task.kind !== "inspection") return false;
      if (trigger.defectId && task.defectId === trigger.defectId) return true;
      return task.vehicleId === trigger.vehicleId;
    case "defect_resolved":
      return task.kind === "defect" && task.defectId === trigger.defectId;
    default:
      return false;
  }
}

export function taskIdsToAutoCompleteForReadyTrips(tasks: YardTask[], trips: Trip[]): string[] {
  const readyTripIds = new Set(trips.filter(t => t.ready).map(t => t.id));
  return tasks
    .filter(t =>
      isTaskOpen(t)
      && t.tripId
      && readyTripIds.has(t.tripId)
      && t.kind !== "check",
    )
    .map(t => t.id);
}

export function applyTaskCompletions(
  tasks: YardTask[],
  taskIds: string[],
  completedBy: string,
  at: string,
  note = AUTO_NOTE,
): { tasks: YardTask[]; completed: YardTask[] } {
  const idSet = new Set(taskIds);
  if (idSet.size === 0) return { tasks, completed: [] };

  const completed: YardTask[] = [];
  const next = tasks.map(task => {
    if (!idSet.has(task.id) || !isTaskOpen(task)) return task;
    const updated: YardTask = {
      ...task,
      status: "completed",
      completedAt: at,
      completedBy,
      completionNote: note,
    };
    completed.push(updated);
    return updated;
  });

  return { tasks: next, completed };
}

export function applyAutoTaskCompletions(
  tasks: YardTask[],
  triggers: TaskCompletionTrigger[],
  completedBy: string,
  at: string,
): { tasks: YardTask[]; completed: YardTask[] } {
  const ids = new Set<string>();
  for (const trigger of triggers) {
    for (const id of taskIdsToAutoComplete(tasks, trigger)) ids.add(id);
  }
  return applyTaskCompletions(tasks, [...ids], completedBy, at);
}

export function applyReadyTripTaskCompletions(
  tasks: YardTask[],
  trips: Trip[],
  completedBy: string,
  at: string,
): { tasks: YardTask[]; completed: YardTask[] } {
  return applyTaskCompletions(
    tasks,
    taskIdsToAutoCompleteForReadyTrips(tasks, trips),
    completedBy,
    at,
  );
}
