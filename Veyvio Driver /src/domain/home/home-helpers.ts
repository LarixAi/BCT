import type { CardTone, DriverHomeSummary, HomeOperationalState } from "@/types/home";

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function syncStatusLabel(summary: DriverHomeSummary): string {
  const { sync } = summary;
  if (!sync.online) {
    const pending = sync.pendingChangeCount;
    return pending > 0
      ? `Offline mode · ${pending} update${pending === 1 ? "" : "s"} waiting to sync`
      : "Offline mode · changes saved on device";
  }
  if (sync.lastSyncedAt) {
    const mins = Math.floor((Date.now() - new Date(sync.lastSyncedAt).getTime()) / 60000);
    if (mins < 1) return "Online · Last synced just now";
    if (mins === 1) return "Online · Last synced 1 min ago";
    return `Online · Last synced ${mins} min ago`;
  }
  return "Online";
}

export function dutyStatusTone(state: HomeOperationalState, compliance: DriverHomeSummary["driver"]["complianceStatus"]): CardTone {
  if (compliance === "blocked" || state === "operationally_blocked") return "red";
  if (state === "vehicle_check_required" || state === "end_of_duty_required") return "amber";
  if (state === "ready_for_work" || state === "journey_assigned") return "green";
  if (state === "journey_active" || state === "on_break") return "navy";
  return "navy";
}

export function toneClasses(tone: CardTone): { border: string; bg: string; label: string } {
  switch (tone) {
    case "red":
      return { border: "border-vor/40", bg: "bg-vor/5", label: "text-vor" };
    case "amber":
      return { border: "border-warn/40", bg: "bg-warn/5", label: "text-warn" };
    case "green":
      return { border: "border-ok/40", bg: "bg-ok/5", label: "text-ok" };
    case "teal":
      return { border: "border-link/40", bg: "bg-link/5", label: "text-link" };
    default:
      return { border: "border-accent/20", bg: "bg-card", label: "text-foreground" };
  }
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

export type HomeCardId =
  | "block"
  | "current_work"
  | "required_action"
  | "duty_status"
  | "vehicle"
  | "schedule"
  | "notice"
  | "end_of_duty";

/** Render order per spec §12 */
export function homeCardOrder(summary: DriverHomeSummary): HomeCardId[] {
  const cards: HomeCardId[] = [];

  if (summary.operationalState === "operationally_blocked" || summary.driver.complianceStatus === "blocked") {
    cards.push("block");
  }

  if (summary.activeTrip) cards.push("current_work");
  else if (summary.nextTrip) cards.push("current_work");

  if (summary.requiredActions.length > 0) cards.push("required_action");

  cards.push("duty_status");

  if (summary.vehicleAssignment) cards.push("vehicle");

  if (summary.todaySchedule.length > 0) cards.push("schedule");

  if (summary.latestOperationalNotice && !summary.latestOperationalNotice.acknowledged) {
    cards.push("notice");
  }

  if (summary.operationalState === "end_of_duty_required") {
    cards.push("end_of_duty");
  }

  return cards;
}

export function homeOperationalHeadline(summary: DriverHomeSummary): string {
  const blocking = summary.requiredActions.find(
    (a) => a.priority === "safety_critical" || a.priority === "work_blocking",
  );
  if (blocking) return blocking.title;

  if (summary.operationalState === "vehicle_check_required") {
    const time = summary.nextTrip?.firstPickupTime ?? summary.nextTrip?.startTime;
    if (time) return `Walkaround due before ${time} departure`;
    return "Walkaround due before first departure";
  }

  if (summary.activeTrip) {
    return summary.activeTrip.delayLabel ?? `On journey — ${summary.activeTrip.name}`;
  }

  if (summary.nextTrip && summary.operationalState === "journey_assigned") {
    return `${summary.nextTrip.name} starts ${summary.nextTrip.startTime}`;
  }

  if (summary.operationalState === "operationally_blocked" && summary.blockReason) {
    return summary.blockReason;
  }

  return dutyStatusHeadline(summary);
}

export function dutyStatusHeadline(summary: DriverHomeSummary): string {
  const { operationalState, duty } = summary;
  switch (operationalState) {
    case "no_duty_scheduled":
      return "You have no duties scheduled today";
    case "duty_scheduled_not_started":
    case "vehicle_check_required":
    case "ready_for_work":
    case "journey_assigned":
      return duty.status === "on_duty" ? "You are on duty" : "You are currently off duty";
    case "journey_active":
      return "You are on duty";
    case "on_break":
      return "Break in progress";
    case "operationally_blocked":
      return "Work blocked";
    case "end_of_duty_required":
      return "Ready to finish duty";
    default:
      return duty.status === "on_duty" ? "You are on duty" : "You are currently off duty";
  }
}

export function dutyPrimaryAction(summary: DriverHomeSummary): { label: string; href?: string } | null {
  switch (summary.operationalState) {
    case "no_duty_scheduled":
      return { label: "Contact operations" };
    case "duty_scheduled_not_started":
      return { label: "Start duty", href: summary.duty.dutyId ? `/duties/${summary.duty.dutyId}` : undefined };
    case "vehicle_check_required":
      return { label: "Start vehicle check", href: summary.duty.dutyId ? `/duties/${summary.duty.dutyId}` : undefined };
    case "ready_for_work":
    case "journey_assigned":
      return {
        label: "Open Duty Hub",
        href: summary.nextTrip ? `/duties/${summary.nextTrip.dutyId}` : summary.duty.dutyId ? `/duties/${summary.duty.dutyId}` : undefined,
      };
    case "journey_active":
      return {
        label: "Continue journey",
        href: summary.activeTrip
          ? `/duties/${summary.activeTrip.dutyId}/journey/active`
          : summary.duty.dutyId
            ? `/duties/${summary.duty.dutyId}/journey/active`
            : undefined,
      };
    case "on_break":
      return { label: "End break" };
    case "end_of_duty_required":
      return { label: "Begin end-of-duty checks" };
    case "operationally_blocked":
      return { label: "View details" };
    default:
      return null;
  }
}
