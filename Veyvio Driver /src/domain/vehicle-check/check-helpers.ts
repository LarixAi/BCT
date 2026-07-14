import type {
  CheckItemResult,
  VehicleCheckGateStatus,
  VehicleCheckSession,
} from "@/types/vehicle-check";
import { getAllItems, getApplicableSections } from "./check-template";

export type CheckStatusTone = "lime" | "teal" | "amber" | "red" | "navy" | "grey";

export function gateStatusLabel(status: VehicleCheckGateStatus): string {
  const labels: Record<VehicleCheckGateStatus, string> = {
    awaiting_check: "Awaiting check",
    check_in_progress: "Check in progress",
    ready_for_service: "Ready for service",
    attention_required: "Attention required",
    defect_reported: "Defect reported",
    awaiting_approval: "Awaiting approval",
    vehicle_held: "Vehicle held",
    vor: "VOR",
    in_maintenance: "In maintenance",
    returned_to_service: "Returned to service",
    unavailable: "Unavailable",
  };
  return labels[status];
}

export function gateStatusTone(status: VehicleCheckGateStatus): CheckStatusTone {
  switch (status) {
    case "ready_for_service":
    case "returned_to_service":
      return "lime";
    case "check_in_progress":
      return "teal";
    case "attention_required":
    case "defect_reported":
    case "awaiting_approval":
      return "amber";
    case "vehicle_held":
    case "vor":
    case "unavailable":
      return "red";
    default:
      return "grey";
  }
}

export function toneClasses(tone: CheckStatusTone): { dot: string; badge: string; border: string } {
  switch (tone) {
    case "lime":
      return { dot: "bg-ok", badge: "bg-ok/15 text-ok", border: "border-ok/30" };
    case "teal":
      return { dot: "bg-primary", badge: "bg-link/15 text-link", border: "border-link/30" };
    case "amber":
      return { dot: "bg-warn", badge: "bg-warn/15 text-warn", border: "border-warn/30" };
    case "red":
      return { dot: "bg-vor", badge: "bg-vor/15 text-vor", border: "border-vor/30" };
    case "navy":
      return { dot: "bg-accent", badge: "bg-accent/15 text-accent", border: "border-accent/30" };
    default:
      return { dot: "bg-muted", badge: "bg-secondary text-muted", border: "border-border" };
  }
}

export function itemResult(session: VehicleCheckSession, itemId: string): CheckItemResult {
  return session.itemResults[itemId]?.result ?? "unanswered";
}

export function sectionProgress(
  session: VehicleCheckSession,
  sectionId: string,
  accessibilityCapable: boolean,
) {
  const section = getApplicableSections(accessibilityCapable).find((s) => s.id === sectionId);
  if (!section) return { pass: 0, defect: 0, pending: 0, total: 0 };

  let pass = 0;
  let defect = 0;
  let pending = 0;

  for (const item of section.items) {
    const r = itemResult(session, item.id);
    if (r === "pass" || r === "not_fitted") pass++;
    else if (r === "defect") defect++;
    else pending++;
  }

  return { pass, defect, pending, total: section.items.length };
}

export function overallProgress(session: VehicleCheckSession, accessibilityCapable: boolean) {
  const items = getAllItems(accessibilityCapable);
  let answered = 0;
  let defects = 0;

  for (const item of items) {
    const r = itemResult(session, item.id);
    if (r !== "unanswered") answered++;
    if (r === "defect") defects++;
  }

  return { answered, total: items.length, defects };
}

export function nextUnansweredItem(session: VehicleCheckSession, accessibilityCapable: boolean) {
  return getAllItems(accessibilityCapable).find((i) => itemResult(session, i.id) === "unanswered");
}

export function allItemsAnswered(session: VehicleCheckSession, accessibilityCapable: boolean) {
  return getAllItems(accessibilityCapable).every((i) => itemResult(session, i.id) !== "unanswered");
}

export function canSubmitCheck(session: VehicleCheckSession, accessibilityCapable: boolean) {
  return (
    session.verified &&
    allItemsAnswered(session, accessibilityCapable) &&
    session.bodyworkNoNewDamage !== undefined &&
    session.declarationHeld === true
  );
}

export function formatCheckReference(date = new Date()): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(Math.floor(Math.random() * 90000) + 10000);
  return `VC-${d}-${seq}`;
}
