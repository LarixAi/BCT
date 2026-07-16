import type { DutyDetail, DutyStop } from "@/types/duty";
import type { DriverAssignment } from "@/types/trips";
import { buildDutyPrepSteps, type DutyPrepStep } from "@/domain/duty/duty-prep-steps";
import { getActiveJourney } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import type { HomeStatusTone } from "@/domain/home/clean-home-view";
import { driverCopy } from "@/copy/driver-messages";

export type DutiesSheetSize = "collapsed" | "medium" | "expanded";

export type DutiesWorkspaceStage =
  | "acknowledge"
  | "vehicle"
  | "check"
  | "clock_in"
  | "ready"
  | "active"
  | "waiting"
  | "return"
  | "handback"
  | "complete"
  | "idle";

export interface DutiesWorkspaceView {
  stage: DutiesWorkspaceStage;
  toneClass: "" | "ready" | "warn" | "critical";
  toneLabel: string;
  stageLabel: string;
  stageTitle: string;
  title: string;
  copy: string;
  meta1: { label: string; value: string };
  meta2: { label: string; value: string };
  primaryLabel: string;
  primaryHref?: string;
  primaryTone: "" | "ready" | "warn" | "critical";
  secondary1: { label: string; href?: string };
  secondary2: { label: string; href?: string };
  pillTitle: string;
  pillSub: string;
  prepSteps: DutyPrepStep[];
  showPrepProgress: boolean;
  mapDutyId?: string;
  detailRows: Array<{ title: string; subtitle: string; href?: string; badge?: string }>;
  journeyRows: Array<{ title: string; subtitle: string; badge?: string; href?: string }>;
  statusTone: HomeStatusTone;
}

function waitingStop(duty: DutyDetail): DutyStop | undefined {
  for (const run of duty.runs) {
    const stop = run.stops.find((s) => s.status === "waiting_for_operations");
    if (stop) return stop;
  }
  return undefined;
}

function nextIncompleteStop(duty: DutyDetail): DutyStop | undefined {
  const journey = getActiveJourney(duty, duty.activeJourneyId);
  return journey?.stops.find((s) => s.status !== "completed" && s.status !== "skipped");
}

function depotReturnRun(duty: DutyDetail) {
  return duty.runs.find(
    (r) =>
      r.status !== "completed" &&
      r.stops.some((s) => s.kind === "depot_return" || /depot|return/i.test(s.name)),
  );
}

/**
 * Map live DutyDetail (+ assignment context) into the Duties workspace sheet.
 */
export function buildDutiesWorkspaceView(
  duty: DutyDetail | undefined,
  assignment?: DriverAssignment,
): DutiesWorkspaceView {
  const prepSteps = duty ? buildDutyPrepSteps(duty) : [];
  const routeName =
    assignment?.runName ?? duty?.routeName ?? "No duty selected";
  const reg = duty?.vehicle?.registrationNumber ?? assignment?.vehicleRegistration;
  const start = duty?.startTime ?? assignment?.scheduledStart;
  const end = duty?.endTime ?? assignment?.scheduledEnd;
  const timeWindow =
    start && end ? `${formatTime(start)}–${formatTime(end)}` : start ? formatTime(start) : "—";
  const dutyHref = duty ? `/trips?dutyId=${duty.id}` : undefined;
  const mapDutyId = duty?.id ?? assignment?.dutyId;

  const idle: DutiesWorkspaceView = {
    stage: "idle",
    toneClass: "",
    toneLabel: "No active duty",
    stageLabel: "Duties",
    stageTitle: "Nothing focused",
    title: "No duty on the board",
    copy: "When Operations assigns work, open it here to prepare and run the journey.",
    meta1: { label: "Today", value: "—" },
    meta2: { label: "Vehicle", value: "—" },
    primaryLabel: "VIEW SCHEDULE",
    primaryHref: undefined,
    primaryTone: "",
    secondary1: { label: "Home", href: "/" },
    secondary2: { label: "Messages", href: "/messages" },
    pillTitle: "Duties",
    pillSub: "Nothing assigned",
    prepSteps: [],
    showPrepProgress: false,
    mapDutyId,
    detailRows: [],
    journeyRows: [],
    statusTone: "neutral",
  };

  if (!duty) return idle;

  const held = waitingStop(duty);
  if (held) {
    return {
      stage: "waiting",
      toneClass: "critical",
      toneLabel: "Do not leave this stop",
      stageLabel: "Route held",
      stageTitle: "Waiting for Operations",
      title: held.name,
      copy: "Remain at the safe location until Operations records a resolution or authorises continuation.",
      meta1: { label: "Stop", value: held.name },
      meta2: { label: "Status", value: "Awaiting Operations" },
      primaryLabel: "VIEW OPERATIONS STATUS",
      primaryHref: `/duties/${duty.id}/help`,
      primaryTone: "critical",
      secondary1: { label: "Call Operations", href: "/more/support" },
      secondary2: { label: "Handover rules", href: `/duties/${duty.id}/passengers` },
      pillTitle: "Route held",
      pillSub: "Waiting for Operations",
      prepSteps,
      showPrepProgress: false,
      mapDutyId: duty.id,
      detailRows: [
        {
          title: "Passengers",
          subtitle: `${duty.passengerCount} on this duty`,
          href: `/duties/${duty.id}/passengers`,
          badge: "View",
        },
      ],
      journeyRows: duty.runs.map((r) => ({
        title: r.name,
        subtitle: r.status.replace(/_/g, " "),
        badge: r.status === "active" ? "Current" : undefined,
        href: dutyHref,
      })),
      statusTone: "critical",
    };
  }

  if (duty.lifecycleStatus === "completed") {
    return {
      stage: "complete",
      toneClass: "ready",
      toneLabel: "All gates passed",
      stageLabel: "End of duty",
      stageTitle: "Ready to finish",
      title: "Complete today’s duty",
      copy: "All journeys are complete and vehicle handback can be recorded if still open.",
      meta1: { label: "Journeys", value: `${duty.runs.filter((r) => r.status === "completed").length} completed` },
      meta2: { label: "Finish", value: formatTime(duty.endTime) },
      primaryLabel: "VIEW DUTY SUMMARY",
      primaryHref: dutyHref,
      primaryTone: "ready",
      secondary1: { label: "Home", href: "/" },
      secondary2: { label: "Add duty note", href: `/duties/${duty.id}/journey/note` },
      pillTitle: "Ready to finish",
      pillSub: "Duty complete",
      prepSteps,
      showPrepProgress: false,
      mapDutyId: duty.id,
      detailRows: [],
      journeyRows: duty.runs.map((r) => ({
        title: r.name,
        subtitle: r.status.replace(/_/g, " "),
        badge: r.status === "completed" ? "Done" : undefined,
      })),
      statusTone: "ready",
    };
  }

  if (
    duty.lifecycleStatus === "in_progress" &&
    !duty.vehicleHandback &&
    duty.runs.every((r) => r.status === "completed" || r.status === "paused")
  ) {
    const returnRun = depotReturnRun(duty);
    if (returnRun && returnRun.status !== "completed") {
      return {
        stage: "return",
        toneClass: "ready",
        toneLabel: "Passenger work complete",
        stageLabel: "Next journey",
        stageTitle: "Return to depot",
        title: `Return to ${duty.reportingLocation}`,
        copy: "The passenger journey is complete. Start the depot return when ready.",
        meta1: { label: "Destination", value: duty.reportingLocation },
        meta2: { label: "Vehicle", value: reg ?? "—" },
        primaryLabel: "OPEN RETURN JOURNEY",
        primaryHref: `/duties/${duty.id}/journey/return`,
        primaryTone: "ready",
        secondary1: { label: "View route", href: `/duties/${duty.id}/nav` },
        secondary2: { label: "Duty summary", href: dutyHref },
        pillTitle: "Next journey",
        pillSub: "Return to depot",
        prepSteps,
        showPrepProgress: false,
        mapDutyId: duty.id,
        detailRows: [],
        journeyRows: duty.runs.map((r) => ({
          title: r.name,
          subtitle: r.status.replace(/_/g, " "),
          badge: r.id === returnRun.id ? "Next" : r.status === "completed" ? "Done" : undefined,
          href: dutyHref,
        })),
        statusTone: "ready",
      };
    }

    return {
      stage: "handback",
      toneClass: "warn",
      toneLabel: "Custody ending",
      stageLabel: "End of duty",
      stageTitle: "Vehicle handback",
      title: "Complete vehicle handback",
      copy: "Record final mileage, condition and key return before ending custody.",
      meta1: { label: "Depot", value: duty.reportingLocation },
      meta2: { label: "Vehicle", value: reg ?? "—" },
      primaryLabel: "BEGIN HANDBACK",
      primaryHref: `/duties/${duty.id}/journey/end`,
      primaryTone: "warn",
      secondary1: { label: "Report damage", href: `/duties/${duty.id}/journey/defect` },
      secondary2: { label: "Passengers", href: `/duties/${duty.id}/passengers` },
      pillTitle: "End of duty",
      pillSub: "Vehicle handback",
      prepSteps,
      showPrepProgress: false,
      mapDutyId: duty.id,
      detailRows: [],
      journeyRows: [],
      statusTone: "warn",
    };
  }

  if (duty.lifecycleStatus === "in_progress") {
    const stop = nextIncompleteStop(duty);
    return {
      stage: "active",
      toneClass: "",
      toneLabel: "On time",
      stageLabel: "Journey in progress",
      stageTitle: stop?.name ?? "Continue journey",
      title: stop ? `Heading to ${stop.name}` : "Journey in progress",
      copy: stop
        ? `Next planned ${formatTime(stop.plannedArrival)}. Keep Home available if you need to switch.`
        : "Open navigation to continue the active journey.",
      meta1: { label: "ETA", value: stop ? formatTime(stop.plannedArrival) : "—" },
      meta2: { label: "Vehicle", value: reg ?? "—" },
      primaryLabel: "OPEN NAVIGATION",
      primaryHref: `/duties/${duty.id}/nav`,
      primaryTone: "",
      secondary1: { label: "Report delay", href: `/duties/${duty.id}/journey/delay` },
      secondary2: { label: "Passengers", href: `/duties/${duty.id}/passengers` },
      pillTitle: "On journey",
      pillSub: stop ? `Next · ${stop.name}` : routeName,
      prepSteps,
      showPrepProgress: false,
      mapDutyId: duty.id,
      detailRows: [
        {
          title: "Passengers",
          subtitle: `${duty.passengerCount} on this duty${duty.escortRequired ? " · escort required" : ""}`,
          href: `/duties/${duty.id}/passengers`,
          badge: "View",
        },
        ...(duty.specialInstructions
          ? [
              {
                title: "Special instructions",
                subtitle: duty.specialInstructions,
                href: dutyHref,
                badge: "Read",
              },
            ]
          : []),
      ],
      journeyRows: duty.runs.map((r) => ({
        title: r.name,
        subtitle: r.status.replace(/_/g, " "),
        badge: r.status === "active" ? "Current" : undefined,
        href: dutyHref,
      })),
      statusTone: "neutral",
    };
  }

  // Prep path
  const current = prepSteps.find((s) => s.current) ?? prepSteps[prepSteps.length - 1];
  const doneCount = prepSteps.filter((s) => s.done).length;

  if (current?.id === "acknowledge") {
    return {
      stage: "acknowledge",
      toneClass: "",
      toneLabel: `Duty preparation · ${doneCount + 1} of 5`,
      stageLabel: "Current step",
      stageTitle: "Acknowledge duty",
      title: driverCopy.duty.whatNext,
      copy: routeName,
      meta1: { label: "Time", value: timeWindow },
      meta2: { label: "Vehicle", value: reg ?? "Not assigned" },
      primaryLabel: "ACKNOWLEDGE DUTY",
      primaryHref: dutyHref,
      primaryTone: "",
      secondary1: { label: "View route", href: mapDutyId ? `/duties/${mapDutyId}/nav` : dutyHref },
      secondary2: { label: "Passengers", href: `/duties/${duty.id}/passengers` },
      pillTitle: start ? `Duty ${formatTime(start)}` : "Duty",
      pillSub: routeName,
      prepSteps,
      showPrepProgress: true,
      mapDutyId: duty.id,
      detailRows: buildDetailRows(duty),
      journeyRows: buildJourneyRows(duty),
      statusTone: "ready",
    };
  }

  if (current?.id === "vehicle") {
    return {
      stage: "vehicle",
      toneClass: "",
      toneLabel: `Duty preparation · ${doneCount + 1} of 5`,
      stageLabel: "Current step",
      stageTitle: "Confirm vehicle",
      title: driverCopy.duty.whatNext,
      copy: reg
        ? `Confirm ${reg} matches the vehicle in front of you.`
        : "Confirm the assigned vehicle matches what is in front of you.",
      meta1: {
        label: "Vehicle",
        value: duty.vehicle
          ? `${duty.vehicle.make} ${duty.vehicle.model}`
          : "Not assigned",
      },
      meta2: { label: "Location", value: duty.reportingLocation },
      primaryLabel: "CONFIRM THIS VEHICLE",
      primaryHref: `/duties/${duty.id}/vehicle`,
      primaryTone: "",
      secondary1: { label: "Wrong vehicle", href: `/duties/${duty.id}/journey/swap` },
      secondary2: { label: "Vehicle details", href: `/duties/${duty.id}/vehicle` },
      pillTitle: start ? `Duty ${formatTime(start)}` : "Duty",
      pillSub: "Confirm vehicle",
      prepSteps,
      showPrepProgress: true,
      mapDutyId: duty.id,
      detailRows: buildDetailRows(duty),
      journeyRows: buildJourneyRows(duty),
      statusTone: "ready",
    };
  }

  if (current?.id === "check") {
    return {
      stage: "check",
      toneClass: "warn",
      toneLabel: "Action required",
      stageLabel: "Current step",
      stageTitle: "Vehicle check",
      title: driverCopy.duty.whatNext,
      copy: `Complete the walkaround for ${reg ?? "the assigned vehicle"} before it enters service.`,
      meta1: { label: "Departure", value: start ? formatTime(start) : "—" },
      meta2: {
        label: "Status",
        value: duty.vehicleCheck.status.replace(/_/g, " "),
      },
      primaryLabel: "START VEHICLE CHECK",
      primaryHref: "/checks",
      primaryTone: "warn",
      secondary1: { label: "Report issue", href: "/incidents/report" },
      secondary2: { label: "Contact Operations", href: "/more/support" },
      pillTitle: start ? `Duty ${formatTime(start)}` : "Duty",
      pillSub: "Check required",
      prepSteps,
      showPrepProgress: true,
      mapDutyId: duty.id,
      detailRows: buildDetailRows(duty),
      journeyRows: buildJourneyRows(duty),
      statusTone: "warn",
    };
  }

  if (current?.id === "clock_in") {
    return {
      stage: "clock_in",
      toneClass: "ready",
      toneLabel: "Vehicle ready",
      stageLabel: "Current step",
      stageTitle: "Clock in",
      title: driverCopy.duty.whatNext,
      copy: "Vehicle cleared. Confirm you are fit and able to complete this duty safely.",
      meta1: { label: "Vehicle", value: reg ? `${reg} · Cleared` : "Cleared" },
      meta2: { label: "Check", value: "Complete" },
      primaryLabel: "CLOCK IN",
      primaryHref: dutyHref,
      primaryTone: "ready",
      secondary1: { label: "Passengers", href: `/duties/${duty.id}/passengers` },
      secondary2: { label: "View eligibility", href: `/duties/${duty.id}/eligibility` },
      pillTitle: start ? `Duty ${formatTime(start)}` : "Duty",
      pillSub: "Ready to clock in",
      prepSteps,
      showPrepProgress: true,
      mapDutyId: duty.id,
      detailRows: buildDetailRows(duty),
      journeyRows: buildJourneyRows(duty),
      statusTone: "ready",
    };
  }

  // ready / start journey
  const firstStop = duty.runs[0]?.stops.find((s) => s.kind !== "depot_departure") ?? duty.runs[0]?.stops[0];
  return {
    stage: "ready",
    toneClass: "ready",
    toneLabel: "Preparation complete",
    stageLabel: "Current step",
    stageTitle: "Start journey",
    title: driverCopy.duty.whatNext,
    copy: "Open the first journey when you are safely positioned and ready to depart.",
    meta1: { label: "First stop", value: firstStop?.name ?? "—" },
    meta2: {
      label: "Pickup",
      value: firstStop ? formatTime(firstStop.plannedArrival) : "—",
    },
    primaryLabel: "OPEN JOURNEY",
    primaryHref: `/duties/${duty.id}/journey/open`,
    primaryTone: "ready",
    secondary1: { label: "View passengers", href: `/duties/${duty.id}/passengers` },
    secondary2: { label: "View route", href: `/duties/${duty.id}/nav` },
    pillTitle: start ? `Duty ${formatTime(start)}` : "Duty",
    pillSub: "Ready to start",
    prepSteps,
    showPrepProgress: true,
    mapDutyId: duty.id,
    detailRows: buildDetailRows(duty),
    journeyRows: buildJourneyRows(duty),
    statusTone: "ready",
  };
}

function buildDetailRows(duty: DutyDetail) {
  const tripsHref = `/trips?dutyId=${duty.id}`;
  const rows: DutiesWorkspaceView["detailRows"] = [
    {
      title: "Passengers",
      subtitle: `${duty.passengerCount} total${duty.escortRequired ? " · escort required" : ""}`,
      href: `/duties/${duty.id}/passengers`,
      badge: "View",
    },
  ];
  if (duty.specialInstructions) {
    rows.push({
      title: "Special instructions",
      subtitle: duty.specialInstructions,
      href: tripsHref,
      badge: "Read",
    });
  }
  return rows;
}

function buildJourneyRows(duty: DutyDetail) {
  const tripsHref = `/trips?dutyId=${duty.id}`;
  return duty.runs.map((r, index) => ({
    title: r.name,
    subtitle: r.status.replace(/_/g, " "),
    badge: index === 0 ? "Current" : "Next",
    href: tripsHref,
  }));
}

export const SHEET_HEIGHT_PX: Record<DutiesSheetSize, number> = {
  collapsed: 170,
  medium: 330,
  expanded: 660,
};
