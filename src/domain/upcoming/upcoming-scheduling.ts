import type { UpcomingBucket, UpcomingPriority } from "@/types/upcoming";

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function classifyDueBucket(dueAt: string | undefined, now = new Date()): UpcomingBucket {
  if (!dueAt) return "month";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "month";

  const start = startOfToday(now).getTime();
  const end = endOfToday(now).getTime();
  const dueTime = due.getTime();

  if (dueTime < start) return "overdue";
  if (dueTime <= end) return "today";
  if (dueTime <= end + 7 * DAY_MS) return "week";
  if (dueTime <= end + 30 * DAY_MS) return "month";
  return "month";
}

export function priorityFromDue(
  dueAt: string | undefined,
  options: { safetyCritical?: boolean; blocksAllocation?: boolean } = {},
  now = new Date(),
): UpcomingPriority {
  if (options.safetyCritical || options.blocksAllocation) return "critical";
  if (!dueAt) return "planned";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "planned";

  const hoursUntil = (due.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hoursUntil < 0) return "critical";
  if (hoursUntil <= 48) return "urgent";
  if (hoursUntil <= 14 * 24) return "upcoming";
  return "planned";
}

export function countByBucket(items: { bucket: UpcomingBucket }[]): Record<UpcomingBucket, number> {
  return items.reduce(
    (acc, item) => {
      acc[item.bucket] += 1;
      return acc;
    },
    { overdue: 0, today: 0, week: 0, month: 0 } as Record<UpcomingBucket, number>,
  );
}
