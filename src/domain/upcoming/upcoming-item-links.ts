import type { UpcomingItem } from "@/types/upcoming";

export type UpcomingItemLink = {
  label: string;
  to: "/tasks/$taskId" | "/yard/$vehicleId/check" | "/yard/$vehicleId" | "/defects/$defectId";
  params: Record<string, string>;
};

export function getUpcomingItemLink(item: UpcomingItem): UpcomingItemLink | null {
  if (item.yardTaskId) {
    return { label: "Start task", to: "/tasks/$taskId", params: { taskId: item.yardTaskId } };
  }
  if (
    (item.category === "inactive_vehicle" ||
      item.category === "weekly_check" ||
      item.category === "safety_inspection" ||
      item.category === "wheel_nut_retorque") &&
    item.vehicleId
  ) {
    return { label: "Start check", to: "/yard/$vehicleId/check", params: { vehicleId: item.vehicleId } };
  }
  if (item.vehicleId) {
    return { label: "View vehicle", to: "/yard/$vehicleId", params: { vehicleId: item.vehicleId } };
  }
  if (item.defectId) {
    return { label: "View defect", to: "/defects/$defectId", params: { defectId: item.defectId } };
  }
  return null;
}

export function formatUpcomingDue(dueAt?: string, now = new Date()): string {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  if (d < start) return "Overdue";
  if (d <= end) return "Due today";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function upcomingItemDayKey(item: UpcomingItem, now = new Date()): string {
  if (item.dueAt) {
    const d = new Date(item.dueAt);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (item.bucket === "overdue") return now.toISOString().slice(0, 10);
  return now.toISOString().slice(0, 10);
}
