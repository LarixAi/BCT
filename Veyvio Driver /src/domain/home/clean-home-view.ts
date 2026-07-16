import type { DriverHomeSummary, HomeOperationalState } from "@/types/home";
import {
  dutyPrimaryAction,
  greetingForHour,
  homeOperationalHeadline,
} from "@/domain/home/home-helpers";

export type HomeStatusTone = "ready" | "warn" | "critical" | "neutral";

export interface CleanHomeView {
  tone: HomeStatusTone;
  statusLabel: string;
  headline: string;
  subhead: string;
  mapLabel: string;
  eyebrow: string;
  primaryTitle: string;
  primaryCopy: string;
  meta1: { label: string; value: string };
  meta2: { label: string; value: string };
  primaryButton: string;
  primaryHref?: string;
  vehicleSubtitle: string;
  vehicleTone: "ready" | "warn";
  actionsSubtitle: string;
  actionsCount: number;
  actionsTone: "ready" | "warn";
  scheduleSubtitle: string;
}

function statusForState(state: HomeOperationalState): { tone: HomeStatusTone; label: string } {
  switch (state) {
    case "operationally_blocked":
      return { tone: "critical", label: "Work blocked" };
    case "vehicle_check_required":
      return { tone: "warn", label: "Vehicle check required" };
    case "journey_active":
      return { tone: "neutral", label: "Journey in progress" };
    case "on_break":
      return { tone: "warn", label: "Break in progress" };
    case "end_of_duty_required":
      return { tone: "ready", label: "Ready to finish duty" };
    case "ready_for_work":
    case "journey_assigned":
    case "duty_scheduled_not_started":
      return { tone: "ready", label: "Ready for duty" };
    case "no_duty_scheduled":
      return { tone: "neutral", label: "No duty scheduled" };
    default:
      return { tone: "neutral", label: "Veyvio Driver" };
  }
}

/**
 * Maps live home summary into the clean Home prototype hierarchy.
 * Operational meaning first; greetings only when nothing is blocking.
 */
export function buildCleanHomeView(summary: DriverHomeSummary): CleanHomeView {
  const { tone, label: statusLabel } = statusForState(summary.operationalState);
  const primary = dutyPrimaryAction(summary);
  const trip = summary.activeTrip ?? summary.nextTrip;
  const dutyId = trip?.dutyId ?? summary.duty.dutyId;
  const blocking = summary.requiredActions.filter(
    (a) => a.priority === "safety_critical" || a.priority === "work_blocking",
  );
  const vehicle = summary.vehicleAssignment;
  const vehicleReady =
    vehicle?.checkStatus === "passed" || vehicle?.checkStatus === "not_required";

  const scheduleCount = summary.todaySchedule.length;
  const finish = summary.todaySchedule[summary.todaySchedule.length - 1]?.time;

  let headline = homeOperationalHeadline(summary);
  let subhead = `${summary.driver.depotName} · ${summary.driver.companyName}`;

  // Soft greeting only when scheduled and nothing is blocking — still ops-led under brand strip
  if (
    summary.operationalState === "duty_scheduled_not_started" ||
    summary.operationalState === "journey_assigned" ||
    summary.operationalState === "ready_for_work"
  ) {
    if (blocking.length === 0) {
      const first = summary.driver.displayName.split(" ")[0] ?? summary.driver.displayName;
      headline = `${greetingForHour(new Date().getHours())}, ${first}`;
      subhead = trip
        ? `Your next duty is ready to prepare — ${trip.name}.`
        : "Your first duty is ready to prepare.";
    }
  }

  if (summary.operationalState === "journey_active" && summary.activeTrip) {
    headline = summary.activeTrip.delayLabel?.startsWith("On")
      ? `Heading to next stop`
      : homeOperationalHeadline(summary);
    subhead = summary.activeTrip.estimatedArrival
      ? `Next stop ETA ${summary.activeTrip.estimatedArrival}.`
      : `On ${summary.activeTrip.name}.`;
  }

  if (summary.operationalState === "operationally_blocked") {
    headline = "Vehicle cannot enter service";
    subhead = summary.blockReason ?? "A safety-critical issue must be resolved before work continues.";
  }

  if (summary.operationalState === "vehicle_check_required") {
    headline = "Complete the walkaround";
    subhead = vehicle
      ? `The assigned vehicle ${vehicle.registration} must be checked before departure.`
      : "Complete the vehicle check before the duty can start.";
  }

  if (summary.operationalState === "end_of_duty_required") {
    headline = "Complete vehicle handback";
    subhead = "All journeys for this duty need closing out.";
  }

  const meta1 =
    summary.operationalState === "journey_active" && summary.activeTrip?.estimatedArrival
      ? { label: "ETA", value: summary.activeTrip.estimatedArrival }
      : trip?.startTime
        ? { label: "Starts", value: `${trip.startTime} today` }
        : { label: "Depot", value: summary.driver.depotName };

  const meta2 =
    summary.operationalState === "journey_active" && summary.activeTrip?.milesRemaining != null
      ? { label: "Remaining", value: `${summary.activeTrip.milesRemaining} miles` }
      : vehicle
        ? { label: "Vehicle", value: vehicle.registration }
        : { label: "Operator", value: summary.driver.companyName };

  let mapLabel = "Duty route preview";
  if (summary.operationalState === "journey_active") mapLabel = "Live journey route";
  if (summary.operationalState === "vehicle_check_required")
    mapLabel = vehicle ? `Vehicle at ${summary.driver.depotName}` : "Depot map";
  if (summary.operationalState === "operationally_blocked") mapLabel = "Vehicle held at depot";
  if (summary.operationalState === "end_of_duty_required")
    mapLabel = `Return complete · ${summary.driver.depotName}`;

  let eyebrow = "Next action";
  let primaryTitle = trip?.name ? `Open ${trip.name}` : primary?.label ?? "Open duty";
  let primaryCopy =
    "Review the vehicle, passengers and departure requirements before you start.";
  let primaryButton = (primary?.label ?? "View duty").toUpperCase();

  if (summary.operationalState === "vehicle_check_required") {
    eyebrow = "Required before departure";
    primaryTitle = vehicle ? `Check ${vehicle.registration}` : "Start vehicle check";
    primaryCopy =
      "Confirm identity, inspect the vehicle and record any defects before it enters service.";
    primaryButton = "START VEHICLE CHECK";
  } else if (summary.operationalState === "journey_active") {
    eyebrow = "Current journey";
    primaryTitle = trip ? `Continue ${trip.name}` : "Continue journey";
    primaryCopy = trip
      ? `${trip.passengersOnboard ?? trip.passengerCount} passengers · continue live navigation.`
      : "Open navigation to continue this journey.";
    primaryButton = "OPEN NAVIGATION";
  } else if (summary.operationalState === "operationally_blocked") {
    eyebrow = "Safety blocker";
    primaryTitle = blocking[0]?.title ?? "View blocked details";
    primaryCopy =
      blocking[0]?.description ??
      "Do not move the vehicle until Operations clears the blocker.";
    primaryButton = "VIEW BLOCKED DETAILS";
  } else if (summary.operationalState === "end_of_duty_required") {
    eyebrow = "End of duty";
    primaryTitle = "Finish today’s duty";
    primaryCopy = "Record final mileage, confirm vehicle condition and complete handback.";
    primaryButton = "BEGIN HANDBACK";
  } else if (summary.operationalState === "on_break") {
    eyebrow = "On break";
    primaryTitle = "End break and resume";
    primaryCopy = "Break time is recorded on the duty. Resume when you are ready to continue.";
    primaryButton = "END BREAK";
  }

  const actionItems = summary.requiredActions;
  const actionsSubtitle =
    actionItems.length === 0
      ? "No blocking actions"
      : actionItems.length === 1
        ? actionItems[0]!.title
        : `${actionItems.length} tasks need attention`;

  return {
    tone,
    statusLabel,
    headline,
    subhead,
    mapLabel,
    eyebrow,
    primaryTitle,
    primaryCopy,
    meta1,
    meta2,
    primaryButton,
    primaryHref: primary?.href ?? (dutyId ? `/trips?dutyId=${dutyId}` : undefined),
    vehicleSubtitle: vehicleReady
      ? vehicle?.roadworthinessStatus === "vor"
        ? "Vehicle off road"
        : "Ready to go"
      : vehicle?.checkStatus === "required" || vehicle?.checkStatus === "in_progress"
        ? "Check required"
        : vehicle
          ? `${vehicle.registration} · review needed`
          : "No vehicle assigned",
    vehicleTone: vehicleReady && vehicle?.roadworthinessStatus !== "vor" ? "ready" : "warn",
    actionsSubtitle,
    actionsCount: actionItems.length,
    actionsTone: actionItems.length === 0 ? "ready" : "warn",
    scheduleSubtitle:
      scheduleCount === 0
        ? "No schedule items today"
        : `${scheduleCount} items${finish ? ` · finish ${finish}` : ""}`,
  };
}

export function statusStripClass(tone: HomeStatusTone): string {
  switch (tone) {
    case "ready":
      return "bg-ok";
    case "warn":
      return "bg-warn";
    case "critical":
      return "bg-vor";
    default:
      return "bg-link";
  }
}
