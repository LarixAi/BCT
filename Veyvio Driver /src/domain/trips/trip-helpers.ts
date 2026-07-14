import type { AssignmentStatus, AssignmentType } from "@/types/trips";

export type StatusTone = "blue" | "green" | "amber" | "red" | "grey";

export function assignmentTypeLabel(type: AssignmentType): string {
  const labels: Record<AssignmentType, string> = {
    single_trip: "Passenger trip",
    school_run: "School run",
    multi_stop_run: "Multi-stop run",
    shuttle: "Shuttle",
    vehicle_movement: "Vehicle movement",
    rescue_replacement: "Rescue / replacement",
  };
  return labels[type];
}

export function statusLabel(status: AssignmentStatus): string {
  return status.replace(/_/g, " ");
}

export function statusTone(status: AssignmentStatus): StatusTone {
  switch (status) {
    case "in_progress":
    case "confirmed":
    case "assigned":
    case "acknowledged":
      return "blue";
    case "ready":
    case "completed":
      return "green";
    case "running_late":
    case "updated":
    case "check_required":
    case "debrief_required":
      return "amber";
    case "cancelled":
      return "red";
    default:
      return "grey";
  }
}

export function toneClasses(tone: StatusTone): { badge: string; border: string; bg: string } {
  switch (tone) {
    case "blue":
      return { badge: "bg-link/15 text-link", border: "border-link/30", bg: "bg-link/5" };
    case "green":
      return { badge: "bg-ok/15 text-ok", border: "border-ok/30", bg: "bg-ok/5" };
    case "amber":
      return { badge: "bg-warn/15 text-warn", border: "border-warn/30", bg: "bg-warn/5" };
    case "red":
      return { badge: "bg-vor/15 text-vor", border: "border-vor/30", bg: "bg-vor/5" };
    default:
      return { badge: "bg-secondary text-muted", border: "border-border", bg: "bg-card" };
  }
}

export function formatScheduleDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatUpcomingDateHeader(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).toUpperCase();
}

export function findActiveAssignment<T extends { status: AssignmentStatus }>(items: T[]): T | undefined {
  return items.find((a) => a.status === "in_progress");
}

export function findNextAssignment<
  T extends { id: string; status: AssignmentStatus; scheduledStart: string },
>(items: T[], excludeId?: string): T | undefined {
  const skip = new Set<AssignmentStatus>(["completed", "cancelled", "in_progress"]);
  return items
    .filter((a) => a.id !== excludeId && !skip.has(a.status))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))[0];
}

export function scheduleAssignmentsExcluding<
  T extends { id: string; status: AssignmentStatus; scheduledStart: string },
>(items: T[], activeId?: string, nextId?: string): T[] {
  const exclude = new Set([activeId, nextId].filter(Boolean));
  return items
    .filter((a) => !exclude.has(a.id))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
}
