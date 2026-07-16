import type { HomeStatusTone } from "@/domain/home/clean-home-view";
import {
  assignmentTypeLabel,
  findActiveAssignment,
  findNextAssignment,
  formatScheduleDate,
  statusLabel,
} from "@/domain/trips/trip-helpers";
import { formatTime } from "@/lib/utils";
import type { DriverAssignment, OperationalAlert } from "@/types/trips";

export interface CleanDutiesView {
  tone: HomeStatusTone;
  statusLabel: string;
  headline: string;
  subhead: string;
  mapLabel: string;
  mapDutyId?: string;
  eyebrow: string;
  primaryTitle: string;
  primaryCopy: string;
  meta1: { label: string; value: string };
  meta2: { label: string; value: string };
  primaryButton: string;
  primaryHref?: string;
  focus?: DriverAssignment;
  remaining: DriverAssignment[];
  completed: DriverAssignment[];
  alerts: OperationalAlert[];
}

function stripForAssignment(assignment: DriverAssignment | undefined): {
  tone: HomeStatusTone;
  label: string;
} {
  if (!assignment) {
    return { tone: "neutral", label: "No duties today" };
  }
  switch (assignment.status) {
    case "in_progress":
    case "running_late":
      return {
        tone: assignment.status === "running_late" ? "warn" : "neutral",
        label:
          assignment.status === "running_late" ? "Running late" : "Journey in progress",
      };
    case "check_required":
      return { tone: "warn", label: "Vehicle check required" };
    case "cancelled":
      return { tone: "critical", label: "Duty cancelled" };
    case "updated":
    case "debrief_required":
      return { tone: "warn", label: statusLabel(assignment.status) };
    case "ready":
    case "confirmed":
    case "assigned":
    case "acknowledged":
      return { tone: "ready", label: "Ready for duty" };
    default:
      return { tone: "neutral", label: statusLabel(assignment.status) };
  }
}

/**
 * Maps today's assignment list into the clean Duties hierarchy
 * (status → headline → map → one primary → flat schedule).
 */
export function buildCleanDutiesView(
  assignments: DriverAssignment[],
  alerts: OperationalAlert[],
): CleanDutiesView {
  const active = findActiveAssignment(assignments);
  const next = active ? undefined : findNextAssignment(assignments);
  const focus = active ?? next;
  const { tone, label: statusLabelText } = stripForAssignment(focus);

  const remaining = assignments
    .filter(
      (a) =>
        a.id !== focus?.id &&
        a.status !== "completed" &&
        a.status !== "cancelled",
    )
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));

  const completed = assignments
    .filter((a) => a.status === "completed" || a.status === "cancelled")
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));

  const today = formatScheduleDate(new Date().toISOString().slice(0, 10));
  const title = focus
    ? (focus.runName ?? assignmentTypeLabel(focus.assignmentType))
    : "No duties scheduled";

  let headline = today;
  let subhead =
    assignments.length === 0
      ? "Nothing assigned for today yet."
      : `${assignments.length} dut${assignments.length === 1 ? "y" : "ies"} on the board.`;

  if (active) {
    headline = active.currentStop
      ? `At ${active.currentStop}`
      : `On ${active.runName ?? assignmentTypeLabel(active.assignmentType)}`;
    subhead = active.nextStop
      ? `Next stop ${active.nextStop}${active.delayLabel ? ` · ${active.delayLabel}` : ""}`
      : active.delayLabel ?? "Journey in progress.";
  } else if (next) {
    headline = `Next: ${next.runName ?? assignmentTypeLabel(next.assignmentType)}`;
    subhead = `Starts ${formatTime(next.scheduledStart)}${
      next.vehicleRegistration ? ` · ${next.vehicleRegistration}` : ""
    }`;
  }

  const mapDutyId = focus?.dutyId;
  const mapLabel = active
    ? "Live journey route"
    : focus
      ? "Duty route preview"
      : "No route to preview";

  return {
    tone,
    statusLabel: statusLabelText,
    headline,
    subhead,
    mapLabel,
    mapDutyId,
    eyebrow: active ? "Current journey" : focus ? "Next action" : "Duties",
    primaryTitle: title,
    primaryCopy: focus
      ? `${focus.origin} → ${focus.destination}`
      : "When Operations assigns work, it will show here.",
    meta1: {
      label: active ? "Status" : "Starts",
      value: active
        ? statusLabel(active.status)
        : focus
          ? formatTime(focus.scheduledStart)
          : "—",
    },
    meta2: {
      label: "Vehicle",
      value: focus?.vehicleRegistration ?? "Not assigned",
    },
    primaryButton: focus?.primaryActionLabel ?? "CHECK BACK LATER",
    primaryHref: focus?.primaryActionHref ?? (focus?.dutyId ? `/duties/${focus.dutyId}` : undefined),
    focus,
    remaining,
    completed,
    alerts,
  };
}
