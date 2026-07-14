import type { YardTask, YardTaskStatus } from "@/types/tasks";

const OPEN_STATUSES: YardTaskStatus[] = ["open", "assigned", "in_progress"];

export function isTaskOpen(task: YardTask): boolean {
  return OPEN_STATUSES.includes(task.status);
}

export function taskStats(tasks: YardTask[] | undefined, userId?: string | null) {
  const list = tasks ?? [];
  const open = list.filter(isTaskOpen);
  const mine = userId ? open.filter(t => t.assigneeId === userId) : [];
  const unassigned = open.filter(t => !t.assigneeId);
  const urgent = open.filter(t => t.priority === "Urgent" || t.priority === "High");
  const dueSoon = open.filter(t => {
    if (!t.dueAt) return false;
    const due = new Date(t.dueAt).getTime();
    const now = Date.now();
    return due - now < 2 * 60 * 60 * 1000 && due >= now;
  });
  const overdue = open.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now());

  return {
    open: open.length,
    mine: mine.length,
    unassigned: unassigned.length,
    urgent: urgent.length,
    dueSoon: dueSoon.length,
    overdue: overdue.length,
    completed: list.filter(t => t.status === "completed").length,
  };
}

export function formatTaskDue(dueAt?: string): string {
  if (!dueAt) return "—";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
