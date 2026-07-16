import type {
  CheckSessionPhase,
  VehicleCheckGateStatus,
  VehicleCheckSession,
  VehicleChecksHome,
} from "@/types/vehicle-check";
import { overallProgress, sectionProgress } from "@/domain/vehicle-check/check-helpers";
import { getApplicableSections } from "@/domain/vehicle-check/check-template";
import type { DutiesSheetSize } from "@/domain/trips/duties-workspace-view";

export type ChecksWorkspaceStage =
  | "verify"
  | "walkaround"
  | "defect"
  | "bodywork"
  | "review"
  | "waiting"
  | "cleared"
  | "vor";

export type CheckZoneId = "front" | "side" | "rear" | "wheels";

export type CheckZoneTone = "idle" | "active" | "done" | "defect";

export interface ChecksWorkspaceView {
  stage: ChecksWorkspaceStage;
  toneClass: "" | "ok" | "warn" | "red";
  toneLabel: string;
  stageLabel: string;
  stageTitle: string;
  title: string;
  copy: string;
  progressPct: number;
  progressText: string;
  defectText: string;
  meta1: { label: string; value: string };
  meta2: { label: string; value: string };
  primaryLabel: string;
  primaryHref?: string;
  primaryTone: "" | "ok" | "warn" | "red";
  primaryAction: "start" | "continue" | "href" | "none";
  secondary1: { label: string; href?: string };
  secondary2: { label: string; href?: string };
  pillTitle: string;
  pillSub: string;
  zones: Record<CheckZoneId, CheckZoneTone>;
  /** 0–5 complete step count for inspection list (current = stepsDone) */
  stepsDone: number;
  inspectionRows: Array<{
    id: string;
    title: string;
    subtitle: string;
    status: "done" | "current" | "pending" | "defect";
    badge: string;
  }>;
  showBottomNavHint: boolean;
}

export type { DutiesSheetSize as ChecksSheetSize };

function zoneForPhase(
  stage: ChecksWorkspaceStage,
  active: CheckZoneId[],
): Record<CheckZoneId, CheckZoneTone> {
  const all: CheckZoneId[] = ["front", "side", "rear", "wheels"];
  const map = Object.fromEntries(all.map((z) => [z, "idle" as CheckZoneTone])) as Record<
    CheckZoneId,
    CheckZoneTone
  >;
  for (const z of active) {
    if (stage === "cleared") map[z] = "done";
    else if (stage === "defect" || stage === "vor" || stage === "waiting") map[z] = "defect";
    else map[z] = "active";
  }
  return map;
}

function mapGateToStage(
  gate: VehicleCheckGateStatus,
  session: VehicleCheckSession | null,
): ChecksWorkspaceStage {
  if (gate === "vor") return "vor";
  if (gate === "vehicle_held" || gate === "awaiting_approval") return "waiting";
  if (gate === "ready_for_service" || gate === "returned_to_service") return "cleared";

  if (!session) {
    if (gate === "check_in_progress") return "walkaround";
    return "verify";
  }

  if (session.phase === "verification" || !session.verified) return "verify";
  if (session.phase === "bodywork") return "bodywork";
  if (session.phase === "review" || session.phase === "submitted") {
    if (session.outcome === "safety_critical_blocked") return "vor";
    if (session.outcome === "defect_awaiting_review") return "waiting";
    if (session.phase === "submitted" && session.outcome === "nil_defects") return "cleared";
    return "review";
  }

  if (session.defects.some((d) => !d.synced && d.severity !== "cosmetic")) return "defect";
  if (session.defects.length > 0 && session.phase === "walkaround") return "defect";

  return "walkaround";
}

/**
 * Map live checks home + optional session into the Checks workspace sheet.
 */
export function buildChecksWorkspaceView(
  home: VehicleChecksHome,
  session: VehicleCheckSession | null,
): ChecksWorkspaceView {
  const stage = mapGateToStage(home.vehicle.gateStatus, session);
  const reg = home.vehicle.registration;
  const accessible = home.vehicle.accessibilityCapable;
  const progress = session
    ? overallProgress(session, accessible)
    : { answered: 0, total: 12, defects: 0 };
  const pct =
    progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;

  const sections = getApplicableSections(accessible);
  const inspectionRows: ChecksWorkspaceView["inspectionRows"] = [
    {
      id: "identity",
      title: "Vehicle identity",
      subtitle: session?.verified
        ? "Registration confirmed"
        : "Confirm registration and dashboard",
      status: session?.verified ? "done" : "current",
      badge: session?.verified ? "Done" : "Current",
    },
    ...sections.slice(0, 4).map((section, index) => {
      const p = session
        ? sectionProgress(session, section.id, accessible)
        : { pass: 0, defect: 0, pending: section.items.length, total: section.items.length };
      const done = p.pending === 0 && p.total > 0;
      const defect = p.defect > 0;
      const identityDone = Boolean(session?.verified);
      const prevDone =
        identityDone &&
        sections.slice(0, index).every((s) => {
          const sp = session
            ? sectionProgress(session, s.id, accessible)
            : { pending: 1 };
          return sp.pending === 0;
        });
      const current = identityDone && prevDone && !done;
      const status: ChecksWorkspaceView["inspectionRows"][number]["status"] = defect
        ? "defect"
        : done
          ? "done"
          : current
            ? "current"
            : "pending";
      return {
        id: section.id,
        title: section.title,
        subtitle: defect
          ? `${p.defect} defect${p.defect === 1 ? "" : "s"} recorded`
          : done
            ? "Section complete"
            : `${p.pass + p.defect} of ${p.total} answered`,
        status,
        badge: defect ? "Defect" : done ? "Done" : current ? "Current" : "Pending",
      };
    }),
  ];

  const stepsDone = inspectionRows.filter((r) => r.status === "done").length;

  const base = {
    pillTitle: reg,
    inspectionRows,
    stepsDone,
    showBottomNavHint: false,
  };

  switch (stage) {
    case "verify":
      return {
        ...base,
        stage,
        toneClass: "",
        toneLabel: "Check required before duty",
        stageLabel: "Vehicle checks",
        stageTitle: "Verify vehicle",
        title: "Confirm the assigned vehicle",
        copy: `Scan or confirm ${reg} before beginning the walkaround.`,
        progressPct: 0,
        progressText: `Verification · 0 of ${progress.total} items`,
        defectText: "No defects",
        meta1: { label: "Assigned", value: reg },
        meta2: { label: "Duty", value: home.dutyLabel },
        primaryLabel: "VERIFY VEHICLE",
        primaryHref: "/checks/verify",
        primaryTone: "",
        primaryAction: session ? "href" : "start",
        secondary1: { label: "Scan QR code", href: "/checks/verify" },
        secondary2: { label: "Wrong vehicle", href: "/checks/verify" },
        pillSub: "Vehicle check required",
        zones: zoneForPhase(stage, ["front"]),
        showBottomNavHint: true,
      };
    case "walkaround":
      return {
        ...base,
        stage,
        toneClass: "",
        toneLabel: "Check in progress",
        stageLabel: "Vehicle check",
        stageTitle: "Walkaround overview",
        title: "Continue the guided walkaround",
        copy: "Complete each section in order. Known issues remain visible while you inspect.",
        progressPct: pct || 33,
        progressText: `${progress.answered} of ${progress.total} items answered`,
        defectText: progress.defects ? `${progress.defects} defect(s)` : "No defects",
        meta1: { label: "Current", value: "Walkaround" },
        meta2: { label: "Vehicle", value: reg },
        primaryLabel: "CONTINUE CHECK",
        primaryHref: "/checks/walkaround",
        primaryTone: "",
        primaryAction: "continue",
        secondary1: { label: "View sections", href: "/checks/walkaround" },
        secondary2: { label: "Report defect", href: "/checks/defect" },
        pillSub: "Check in progress",
        zones: zoneForPhase(stage, ["front", "side"]),
      };
    case "defect":
      return {
        ...base,
        stage,
        toneClass: "warn",
        toneLabel: "Safety assessment required",
        stageLabel: "Defect report",
        stageTitle: "Record the defect",
        title: "Record the defect clearly",
        copy: "Add a description, photo and your safety assessment before submitting.",
        progressPct: pct || 50,
        progressText: `${progress.answered} of ${progress.total} items answered`,
        defectText: `${session?.defects.length ?? 1} draft defect`,
        meta1: { label: "Vehicle", value: reg },
        meta2: { label: "Timing", value: "Before duty" },
        primaryLabel: "CONTINUE DEFECT REPORT",
        primaryHref: "/checks/defect",
        primaryTone: "warn",
        primaryAction: "href",
        secondary1: { label: "Take photo", href: "/checks/defect" },
        secondary2: { label: "Back to walkaround", href: "/checks/walkaround" },
        pillSub: "Defect being recorded",
        zones: zoneForPhase(stage, ["wheels"]),
      };
    case "bodywork":
      return {
        ...base,
        stage,
        toneClass: "",
        toneLabel: "Evidence before assumption",
        stageLabel: "Bodywork review",
        stageTitle: "Compare damage",
        title: "Check for new or worsened damage",
        copy: "Compare the vehicle with the existing bodywork records before confirming.",
        progressPct: pct || 83,
        progressText: `${progress.answered} of ${progress.total} items answered`,
        defectText: `${home.knownIssues.cosmeticDamageCount} existing record(s)`,
        meta1: { label: "Existing records", value: String(home.knownIssues.cosmeticDamageCount) },
        meta2: { label: "Vehicle", value: reg },
        primaryLabel: "OPEN BODYWORK REVIEW",
        primaryHref: "/checks/known-issues",
        primaryTone: "ok",
        primaryAction: "href",
        secondary1: { label: "Report new damage", href: "/checks/defect" },
        secondary2: { label: "View history", href: "/checks/history" },
        pillSub: "Bodywork review",
        zones: zoneForPhase(stage, ["side"]),
      };
    case "review":
      return {
        ...base,
        stage,
        toneClass: "",
        toneLabel: "Final review",
        stageLabel: "Vehicle check",
        stageTitle: "Review and submit",
        title: "Review the completed check",
        copy: "Confirm readings, defects and your fit-for-service declaration.",
        progressPct: 100,
        progressText: `${progress.total} of ${progress.total} items answered`,
        defectText: progress.defects ? `${progress.defects} defect(s)` : "No defects",
        meta1: {
          label: "Odometer",
          value: session?.odometer
            ? `${session.odometer.toLocaleString()} miles`
            : `${home.vehicle.mileage.toLocaleString()} miles`,
        },
        meta2: { label: "Fuel", value: session?.fuelLevel ?? home.vehicle.fuelOrChargeLevel },
        primaryLabel: "SUBMIT VEHICLE CHECK",
        primaryHref: "/checks/review",
        primaryTone: "",
        primaryAction: "href",
        secondary1: { label: "Review defects", href: "/checks/defect" },
        secondary2: { label: "Edit walkaround", href: "/checks/walkaround" },
        pillSub: "Ready to submit",
        zones: zoneForPhase(stage, ["front", "side", "rear", "wheels"]),
      };
    case "waiting":
      return {
        ...base,
        stage,
        toneClass: "warn",
        toneLabel: "Do not enter service",
        stageLabel: "Decision pending",
        stageTitle: "Vehicle held",
        title: "Waiting for Operations",
        copy:
          home.vehicle.vorRestrictions?.[0] ??
          "The check was received, but a reported defect needs an operational decision.",
        progressPct: 100,
        progressText: session?.checkReference
          ? `Submitted · ${session.checkReference}`
          : "Submitted · awaiting decision",
        defectText: "1 defect under review",
        meta1: { label: "Vehicle", value: reg },
        meta2: { label: "Status", value: "Held" },
        primaryLabel: "VIEW DECISION STATUS",
        primaryHref: "/checks/result",
        primaryTone: "warn",
        primaryAction: "href",
        secondary1: { label: "Call Operations", href: "/more/support" },
        secondary2: { label: "View defect", href: "/checks/defect" },
        pillSub: "Awaiting decision",
        zones: zoneForPhase(stage, ["wheels"]),
        showBottomNavHint: true,
      };
    case "cleared":
      return {
        ...base,
        stage,
        toneClass: "ok",
        toneLabel: "Vehicle released",
        stageLabel: "Check complete",
        stageTitle: "Ready for service",
        title: `${reg} is ready to go`,
        copy: "The check has been accepted and applies to this vehicle assignment.",
        progressPct: 100,
        progressText: home.vehicle.lastCompletedCheck
          ? `Accepted · ${home.vehicle.lastCompletedCheck.reference}`
          : "Accepted",
        defectText: "No blocking defects",
        meta1: {
          label: "Completed",
          value: home.vehicle.lastCompletedCheck?.completedAt ?? "Today",
        },
        meta2: { label: "Valid for", value: home.dutyLabel },
        primaryLabel: "RETURN TO DUTY",
        primaryHref: home.dutyId ? `/trips?dutyId=${home.dutyId}` : "/trips",
        primaryTone: "ok",
        primaryAction: "href",
        secondary1: { label: "View record", href: "/checks/result" },
        secondary2: { label: "Report later defect", href: "/checks/defect" },
        pillSub: "Ready for service",
        zones: zoneForPhase(stage, ["front", "side", "rear", "wheels"]),
        showBottomNavHint: true,
      };
    case "vor":
      return {
        ...base,
        stage,
        toneClass: "red",
        toneLabel: "Safety-critical defect",
        stageLabel: "Check outcome",
        stageTitle: "Vehicle off road",
        title: "Vehicle cannot enter service",
        copy:
          home.vehicle.vorRestrictions?.[0] ??
          `A safety-critical defect has placed ${reg} off road. Do not move it.`,
        progressPct: 100,
        progressText: session?.checkReference
          ? `Submitted · ${session.checkReference}`
          : "Vehicle off road",
        defectText: "1 safety-critical defect",
        meta1: { label: "Vehicle", value: reg },
        meta2: { label: "Status", value: "VOR" },
        primaryLabel: "VIEW BLOCKED DETAILS",
        primaryHref: "/checks/result",
        primaryTone: "red",
        primaryAction: "href",
        secondary1: { label: "Call Operations", href: "/more/support" },
        secondary2: { label: "View evidence", href: "/checks/result" },
        pillSub: "Vehicle off road",
        zones: zoneForPhase(stage, ["wheels"]),
        showBottomNavHint: true,
      };
  }
}

export function phaseLabel(phase: CheckSessionPhase | undefined): string {
  switch (phase) {
    case "verification":
      return "Verification";
    case "walkaround":
      return "Walkaround";
    case "bodywork":
      return "Bodywork";
    case "review":
      return "Review";
    case "submitted":
      return "Submitted";
    default:
      return "Not started";
  }
}
