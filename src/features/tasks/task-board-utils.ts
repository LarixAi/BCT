import type { YardTask, YardTaskStatus } from "@/types/tasks";

export type BoardColumnId = "todo" | "in_progress" | "in_review" | "completed";

export type BoardColumn = {
  id: BoardColumnId;
  label: string;
  statuses: YardTaskStatus[];
  color: string;
  tone: "neutral" | "progress" | "review" | "ok";
};

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: "todo", label: "To-do", statuses: ["open", "assigned"], color: "#98a2b3", tone: "neutral" },
  { id: "in_progress", label: "In progress", statuses: ["in_progress"], color: "#f79009", tone: "progress" },
  { id: "in_review", label: "In review", statuses: [], color: "#7a5af8", tone: "review" },
  { id: "completed", label: "Completed", statuses: ["completed"], color: "#12b76a", tone: "ok" },
];

export type StatusBreakdownItem = BoardColumn & {
  count: number;
  pct: number;
};

export function activeBoardTasks(tasks: YardTask[]): YardTask[] {
  return tasks.filter(t => t.status !== "cancelled");
}

export function buildStatusBreakdown(tasks: YardTask[]): StatusBreakdownItem[] {
  const list = activeBoardTasks(tasks);
  const total = list.length || 1;
  return BOARD_COLUMNS.map(col => {
    const count = list.filter(t => col.statuses.includes(t.status)).length;
    return {
      ...col,
      count,
      pct: Math.round((count / total) * 100),
    };
  });
}

export function tasksForColumn(tasks: YardTask[], column: BoardColumn): YardTask[] {
  return activeBoardTasks(tasks).filter(t => column.statuses.includes(t.status));
}

export function taskProgress(status: YardTaskStatus): number {
  switch (status) {
    case "open":
      return 0;
    case "assigned":
      return 30;
    case "in_progress":
      return 65;
    case "completed":
      return 100;
    default:
      return 0;
  }
}

export function taskProjectLabel(task: YardTask): string {
  if (task.tripId) return "Departure run";
  if (task.vehicleId) return "Vehicle action";
  if (task.defectId) return "Defect follow-up";
  if (task.kind === "check") return "Pre-departure check";
  if (task.kind === "equipment") return "Equipment";
  return "Depot task";
}

export function formatTaskCardDue(dueAt?: string): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  return `Due: ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function formatTaskShortDue(dueAt?: string): string {
  if (!dueAt) return "—";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function taskInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function isTaskUrgent(task: YardTask): boolean {
  return task.priority === "Urgent" || task.priority === "High";
}

export function upcomingDeadlineCount(tasks: YardTask[]): number {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return activeBoardTasks(tasks).filter(t => {
    if (!t.dueAt || t.status === "completed") return false;
    const due = new Date(t.dueAt).getTime();
    return due >= now && due - now <= weekMs;
  }).length;
}

export function pendingTaskCount(tasks: YardTask[]): number {
  return activeBoardTasks(tasks).filter(t => t.status !== "completed").length;
}

export type SortKey = "due" | "priority";

export function sortTasks(tasks: YardTask[], sort: SortKey): YardTask[] {
  const priorityRank: Record<YardTask["priority"], number> = {
    Urgent: 0,
    High: 1,
    Normal: 2,
    Low: 3,
  };
  return [...tasks].sort((a, b) => {
    if (sort === "priority") {
      const diff = priorityRank[a.priority] - priorityRank[b.priority];
      if (diff !== 0) return diff;
    }
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
}

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function taskDueDayKey(task: YardTask): string | null {
  if (!task.dueAt) return null;
  const d = new Date(task.dueAt);
  if (Number.isNaN(d.getTime())) return null;
  return dayKey(d);
}
