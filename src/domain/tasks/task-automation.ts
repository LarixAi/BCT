import { isTaskOpen } from "@/domain/tasks/task-stats";
import type { Defect, Trip, Vehicle, VorCase } from "@/types/yard";
import type { YardTask, YardTaskKind, YardTaskPriority } from "@/types/tasks";

export type TaskIdFactory = (prefix: string) => string;

function priorityForDefect(severity: Defect["severity"]): YardTaskPriority {
  if (severity === "Safety-critical") return "Urgent";
  if (severity === "Major") return "High";
  return "Normal";
}

function tripDueAt(departAt: string): string | undefined {
  const [h, m] = departAt.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function hasOpenDefectTask(tasks: YardTask[], defectId: string): boolean {
  return tasks.some(t => isTaskOpen(t) && t.defectId === defectId && t.kind === "defect");
}

export function hasOpenInspectionTaskForDefect(tasks: YardTask[], defectId: string): boolean {
  return tasks.some(t => isTaskOpen(t) && t.defectId === defectId && t.kind === "inspection");
}

export function hasOpenTaskForTrip(tasks: YardTask[], tripId: string): boolean {
  return tasks.some(t => isTaskOpen(t) && t.tripId === tripId);
}

export function mergeAutomatedTasks(
  existing: YardTask[],
  incoming: YardTask[],
): { tasks: YardTask[]; added: YardTask[] } {
  const toAdd = incoming.filter(t => !isDuplicateAutomatedTask(existing, t));
  if (toAdd.length === 0) return { tasks: existing, added: [] };
  return { tasks: [...toAdd, ...existing], added: toAdd };
}

function isDuplicateAutomatedTask(existing: YardTask[], candidate: YardTask): boolean {
  if (candidate.defectId && candidate.kind === "defect" && hasOpenDefectTask(existing, candidate.defectId)) {
    return true;
  }
  if (candidate.defectId && candidate.kind === "inspection" && hasOpenInspectionTaskForDefect(existing, candidate.defectId)) {
    return true;
  }
  if (candidate.tripId && hasOpenTaskForTrip(existing, candidate.tripId)) return true;
  return existing.some(
    t => isTaskOpen(t)
      && t.kind === candidate.kind
      && t.vehicleId === candidate.vehicleId
      && t.title === candidate.title,
  );
}

export function buildDefectTask(
  defect: Defect,
  vehicle: Vehicle | undefined,
  createdBy: string,
  nextId: TaskIdFactory,
): YardTask {
  const reg = vehicle?.reg ?? defect.vehicleId;
  return {
    id: nextId("task"),
    title: `Investigate ${defect.category.toLowerCase()} defect — ${reg}`,
    description: defect.notes,
    kind: "defect",
    priority: priorityForDefect(defect.severity),
    status: "open",
    vehicleId: defect.vehicleId,
    defectId: defect.id,
    createdAt: new Date().toISOString(),
    createdBy,
    dueAt: defect.severity === "Safety-critical"
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : undefined,
  };
}

export function buildVorTask(
  vorCase: VorCase,
  vehicle: Vehicle | undefined,
  createdBy: string,
  nextId: TaskIdFactory,
): YardTask {
  const reg = vehicle?.reg ?? vorCase.vehicleId;
  return {
    id: nextId("task"),
    title: `Confirm VOR — ${reg}`,
    description: vorCase.reason,
    kind: "inspection",
    priority: "Urgent",
    status: "open",
    vehicleId: vorCase.vehicleId,
    defectId: vorCase.defectId,
    createdAt: new Date().toISOString(),
    createdBy,
  };
}

function kindForBlockers(blockers: Trip["blockers"]): YardTaskKind {
  if (blockers.includes("Check missing")) return "check";
  if (blockers.includes("Not on departure line")) return "move";
  if (blockers.includes("Equipment non-compliant") || blockers.includes("Equipment restricted")) {
    return "equipment";
  }
  return "general";
}

export function buildBlockedTripTask(
  trip: Trip,
  vehicle: Vehicle | undefined,
  createdBy: string,
  nextId: TaskIdFactory,
): YardTask | null {
  if (trip.ready || trip.blockers.length === 0) return null;
  const reg = vehicle?.reg ?? trip.vehicleId ?? trip.code;
  const primary = trip.blockers[0] ?? "Blocked";
  return {
    id: nextId("task"),
    title: `Unblock departure — ${trip.code}`,
    description: `${trip.service} · ${primary}${trip.blockers.length > 1 ? ` (+${trip.blockers.length - 1} more)` : ""}`,
    kind: kindForBlockers(trip.blockers),
    priority: trip.blockers.some(b => b === "VOR" || b === "Check missing") ? "High" : "Normal",
    status: "open",
    vehicleId: trip.vehicleId,
    tripId: trip.id,
    createdAt: new Date().toISOString(),
    createdBy,
    dueAt: tripDueAt(trip.departAt),
  };
}

export function tasksFromBlockedTrips(
  trips: Trip[],
  vehicles: Vehicle[],
  existing: YardTask[],
  createdBy: string,
  nextId: TaskIdFactory,
): YardTask[] {
  const created: YardTask[] = [];
  for (const trip of trips) {
    if (trip.departedAt) continue;
    if (hasOpenTaskForTrip([...existing, ...created], trip.id)) continue;
    const vehicle = trip.vehicleId ? vehicles.find(v => v.id === trip.vehicleId) : undefined;
    const task = buildBlockedTripTask(trip, vehicle, createdBy, nextId);
    if (task) created.push(task);
  }
  return created;
}

export function openTasksForVehicle(tasks: YardTask[], vehicleId: string): YardTask[] {
  return (tasks ?? []).filter(t => isTaskOpen(t) && t.vehicleId === vehicleId);
}

export function parseTaskScanRef(input: string): string | null {
  const trimmed = input.trim();
  const patterns = [
    /^task[:/]([a-z0-9_]+)$/i,
    /^veyvio:task:([a-z0-9_]+)$/i,
    /^TASK-([a-z0-9_]+)$/i,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function pickBoardTasks(
  tasks: YardTask[] | undefined,
  userId: string | null | undefined,
  limit = 3,
): YardTask[] {
  const open = (tasks ?? []).filter(isTaskOpen);
  const priorityRank: Record<YardTask["priority"], number> = {
    Urgent: 0,
    High: 1,
    Normal: 2,
    Low: 3,
  };

  const score = (task: YardTask): number => {
    let s = priorityRank[task.priority] * 10;
    if (userId && task.assigneeId === userId) {
      s -= task.status === "in_progress" ? 40 : 20;
    } else if (!task.assigneeId) {
      s -= 5;
    }
    if (task.dueAt) {
      const due = new Date(task.dueAt).getTime();
      if (due < Date.now()) s -= 15;
      else if (due - Date.now() < 2 * 60 * 60 * 1000) s -= 8;
    }
    return s;
  };

  return [...open].sort((a, b) => score(a) - score(b)).slice(0, limit);
}
