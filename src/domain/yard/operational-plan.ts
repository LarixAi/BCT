import type { OperationalDayPlan, YardStagingItem } from "@/types/plan";
import type { YardTask } from "@/types/tasks";
import type { TaskIdFactory } from "@/domain/tasks/task-automation";
import { isTaskOpen } from "@/domain/tasks/task-stats";

export function stagingSorted(plan: OperationalDayPlan | null | undefined): YardStagingItem[] {
  if (!plan?.staging?.length) return [];
  return [...plan.staging].sort((a, b) => a.sequence - b.sequence);
}

export function canAcknowledgePlan(plan: OperationalDayPlan | null | undefined): boolean {
  return !!plan && plan.status === "published";
}

export function acknowledgePlan(
  plan: OperationalDayPlan,
  at: string,
): OperationalDayPlan {
  return {
    ...plan,
    status: "acknowledged",
    publishedAt: plan.publishedAt ?? at,
  };
}

/** Prep tasks from published staging — one open move/check task per vehicle. */
export function buildPrepTasksFromPlan(
  plan: OperationalDayPlan,
  existing: YardTask[],
  createdBy: string,
  nextId: TaskIdFactory,
  createdAt = new Date().toISOString(),
): YardTask[] {
  if (plan.status !== "published" && plan.status !== "acknowledged") return [];

  const created: YardTask[] = [];
  for (const item of stagingSorted(plan)) {
    const title = `Stage for ${item.tripCode ?? item.departAt} — ${item.vehicleReg}`;
    if (hasOpenPrepTask(existing, item.vehicleId, title) || hasOpenPrepTask(created, item.vehicleId, title)) {
      continue;
    }
    created.push({
      id: nextId("task"),
      title,
      description: [
        item.instructions,
        item.targetBayId ? `Target bay ${item.targetBayId}` : undefined,
        `Depart ${item.departAt}`,
      ]
        .filter(Boolean)
        .join(" · "),
      kind: "move",
      priority: item.sequence <= 2 ? "High" : "Normal",
      status: "open",
      vehicleId: item.vehicleId,
      tripId: item.dutyId,
      createdAt,
      createdBy,
      dueAt: dueAtFromDepart(item.departAt, plan.operationalDate),
    });
  }
  return created;
}

function hasOpenPrepTask(tasks: YardTask[], vehicleId: string, title: string): boolean {
  return tasks.some(
    t => isTaskOpen(t) && t.kind === "move" && t.vehicleId === vehicleId && t.title === title,
  );
}

function dueAtFromDepart(departAt: string, operationalDate: string): string | undefined {
  const [h, m] = departAt.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  const d = new Date(`${operationalDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(h, m, 0, 0);
  // Prep should finish ~45 minutes before departure
  d.setMinutes(d.getMinutes() - 45);
  return d.toISOString();
}

export function planHeadline(plan: OperationalDayPlan | null | undefined): string {
  if (!plan) return "No operational day plan published";
  const count = plan.staging.length;
  if (count === 0) return `Plan ${plan.operationalDate} — no staging order yet`;
  if (count === 1) return `One vehicle in tomorrow's staging order`;
  return `${count} vehicles in tomorrow's staging order`;
}
