import {
  buildLiveBootstrapShell,
  COMMAND_HUB_BOOTSTRAP_SOURCE,
  type BootstrapPayload,
} from "@/data/mocks/bootstrap";
import type {
  YardHubMovement,
  YardHubResponse,
  YardHubTask,
  YardHubVehicle,
} from "@/platform/auth/command-auth-api";
import type { YardRole } from "@/types/permissions";
import type { DamageObservation, DamageSeverity } from "@/types/condition";
import type { YardTask, YardTaskKind, YardTaskPriority, YardTaskStatus } from "@/types/tasks";
import type {
  Bay,
  BayZone,
  Movement,
  MovementReason,
  Vehicle,
  VehicleStatus,
  VehicleType,
} from "@/types/yard";
import type { YardHubLayoutSnapshot } from "@veyvio/yard";
import { ingestHubPlatformEvents } from "@/platform/ops/ingest-hub-platform-events";
import { BCT_MAIN_DEPOT_LAYOUT } from "@veyvio/yard";
import type { YardCheckResult, YardCheckSectionResult, YardCheckType, CheckSafetyOutcome } from "@/types/yard-check";

type HubBodyworkReport = {
  id: string;
  vehicleId: string;
  description: string;
  severity: string;
  reportedAt: string;
  zone?: string | null;
};

function mapVehicleType(category: string | null | undefined): VehicleType {
  const c = (category ?? "").toLowerCase();
  if (c.includes("wav") || c.includes("wheelchair")) return "WAV";
  if (c.includes("coach")) return "Coach";
  if (c.includes("low")) return "Low-floor";
  return "Minibus";
}

function mapStatus(row: YardHubVehicle): VehicleStatus {
  const readiness = (row.readinessState ?? "").toLowerCase();
  const zone = (row.zone ?? "").toLowerCase();
  if (readiness === "vor" || row.exceptionLabels?.includes("VOR")) return "VOR";
  if (zone.includes("workshop") || readiness === "work_required") return "In Workshop";
  if (zone.includes("departure")) return "On Departure Line";
  if (
    readiness === "awaiting_inspection" ||
    zone.includes("inspection") ||
    zone.includes("wash") ||
    zone.includes("fuel")
  ) {
    return "Awaiting Check";
  }
  if ((row.presenceState ?? "").toLowerCase() === "off_site") return "Off-site";
  return "Available";
}

function mapZone(row: YardHubVehicle): BayZone {
  const zone = (row.zone ?? "").toLowerCase();
  if (zone.includes("workshop")) return "Workshop";
  if (zone.includes("inspection")) return "Inspection";
  if (zone.includes("departure")) return "Departure Line";
  if (zone.includes("wash")) return "Wash";
  if (zone.includes("fuel")) return "Fuel";
  if ((row.presenceState ?? "").toLowerCase() === "off_site") return "Off-site";
  return "Parking";
}

function mapTaskPriority(priority: string): YardTaskPriority {
  switch (priority) {
    case "safety_critical":
    case "urgent":
      return "Urgent";
    case "important":
      return "High";
    case "routine":
    default:
      return "Normal";
  }
}

function mapTaskKind(taskType: string): YardTaskKind {
  const t = taskType.toLowerCase();
  if (t.includes("move")) return "move";
  if (t.includes("inspection") || t.includes("check")) return "check";
  if (t.includes("equipment") || t.includes("replenish")) return "equipment";
  if (t.includes("damage") || t.includes("quarantine")) return "defect";
  return "general";
}

function mapTaskStatus(status: string): YardTaskStatus {
  switch (status) {
    case "assigned":
      return "assigned";
    case "in_progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "awaiting_sync":
    case "open":
    default:
      return "open";
  }
}

function mapHubTask(row: YardHubTask, companyId: string): YardTask {
  return {
    id: row.id,
    title: row.title,
    description: row.instructions ?? undefined,
    kind: mapTaskKind(row.taskType),
    priority: mapTaskPriority(row.priority),
    status: mapTaskStatus(row.status),
    dueAt: row.dueAt ?? undefined,
    vehicleId: row.vehicleId || undefined,
    assigneeName: row.assignedStaffName ?? undefined,
    createdAt: row.createdAt,
    createdBy: row.createdBy || companyId,
    acceptedAt: row.status === "in_progress" ? row.createdAt : undefined,
    completedAt: row.completedAt ?? undefined,
  };
}

function mapMovementReason(reason: string, toLocation: string): MovementReason {
  const text = `${reason} ${toLocation}`.toLowerCase();
  if (text.includes("departure")) return "Move to departure line";
  if (text.includes("inspection")) return "Move to inspection";
  if (text.includes("fuel")) return "Move to fuel";
  if (text.includes("wash")) return "Move to wash";
  if (text.includes("workshop")) return "Move to workshop";
  if (text.includes("off-site") || text.includes("off site")) return "Move off-site";
  if (text.includes("return")) return "Return from off-site";
  if (text.includes("service") || text.includes("depart")) return "Departed for service";
  return "Move to parking";
}

function mapHubMovement(row: YardHubMovement): Movement {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    fromBayId: row.fromLocation,
    toBayId: row.toLocation,
    reason: mapMovementReason(row.reason, row.toLocation),
    at: row.completedAt ?? row.startedAt,
    by: row.completedBy ?? row.requestedBy,
    note: row.reason,
  };
}

function mapBodyworkSeverity(severity: string): DamageSeverity {
  const s = severity.toLowerCase();
  if (s.includes("safety") || s.includes("critical")) return "safety_critical";
  if (s.includes("major") || s.includes("operational")) return "operational";
  return "cosmetic";
}

function mapBodyworkReports(reports: HubBodyworkReport[]): DamageObservation[] {
  return reports.map(report => ({
    id: report.id,
    inspectionId: "",
    vehicleId: report.vehicleId,
    zoneId: report.zone ?? "unknown",
    reportSource: "driver_report",
    reportedBy: "Driver",
    observedAt: report.reportedAt,
    classification: "possible_new_review",
    description: report.description,
    severity: mapBodyworkSeverity(report.severity),
    mediaIds: [],
  }));
}

type HubVehicleCheck = {
  id: string;
  vehicleId?: string;
  registrationNumber?: string;
  driverName?: string | null;
  checkType?: string;
  result?: string;
  startedAt?: string | null;
  submittedAt?: string;
  odometer?: number | null;
  checklist?: { yardSections?: YardCheckSectionResult[]; checkType?: string };
  evidence?: { safetyOutcome?: CheckSafetyOutcome; durationSeconds?: number; completedBy?: string };
};

function mapHubCheckType(raw: string | undefined): YardCheckType {
  const known: YardCheckType[] = [
    "start-of-day",
    "driver-changeover",
    "between-run",
    "return-to-yard",
    "yard-spot",
    "first-use",
    "vor-assessment",
    "return-to-service",
    "scheduled-inspection",
  ];
  const normalized = (raw ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (known.includes(normalized as YardCheckType)) return normalized as YardCheckType;
  if (normalized.includes("yard") && normalized.includes("spot")) return "yard-spot";
  if (normalized.includes("return") && normalized.includes("service")) return "return-to-service";
  if (normalized.includes("vor")) return "vor-assessment";
  if (normalized.includes("scheduled")) return "scheduled-inspection";
  return "start-of-day";
}

function mapHubVehicleCheck(row: HubVehicleCheck): YardCheckResult | null {
  if (!row.vehicleId) return null;
  const checklist = row.checklist ?? {};
  const sections = Array.isArray(checklist.yardSections) ? checklist.yardSections : [];
  const checkType = mapHubCheckType(checklist.checkType ?? row.checkType);
  const result = (row.result ?? "").toLowerCase();
  const passed = !["fail", "failed"].includes(result);
  const safetyOutcome =
    row.evidence?.safetyOutcome ??
    (result.includes("advisory") ? "attention" : passed ? "ready" : "hold");
  const completedAt = row.submittedAt ?? new Date().toISOString();
  return {
    id: row.id,
    vehicleId: String(row.vehicleId),
    checkType,
    startedAt: row.startedAt ?? completedAt,
    completedAt,
    at: completedAt,
    by: row.evidence?.completedBy ?? row.driverName ?? "Yard",
    odometer: row.odometer ?? undefined,
    sections,
    overallPassed: passed,
    safetyOutcome,
    durationSeconds: row.evidence?.durationSeconds ?? undefined,
  };
}

function hubBayToBayId(bayLabel: string | null | undefined): string {
  if (!bayLabel?.trim()) return "";
  const match = bayLabel.match(/(\d+)/);
  if (match) return `BAY-${match[1].padStart(2, "0")}`;
  return bayLabel.trim();
}

function layoutSnapshotToBays(layout: YardHubLayoutSnapshot | null | undefined): Bay[] {
  if (!layout?.bays?.length) return [];
  return layout.bays.map(b => ({
    id: b.id,
    zone: "Parking" as BayZone,
    bayNumber: b.bayNumber,
    displayName: b.displayName,
  }));
}

function resolveHubLayout(hub: YardHubResponse): YardHubLayoutSnapshot | null {
  if (hub.yardLayout) return hub.yardLayout;
  if (hub.depotCode?.toUpperCase() === "BCT-MAIN" || hub.yardMapEnabled) {
    return {
      layoutId: BCT_MAIN_DEPOT_LAYOUT.id,
      depotCode: BCT_MAIN_DEPOT_LAYOUT.depotCode,
      name: BCT_MAIN_DEPOT_LAYOUT.name,
      canvasWidth: BCT_MAIN_DEPOT_LAYOUT.canvasWidth,
      canvasHeight: BCT_MAIN_DEPOT_LAYOUT.canvasHeight,
      yardMapEnabled: true,
      zones: BCT_MAIN_DEPOT_LAYOUT.zones,
      bays: BCT_MAIN_DEPOT_LAYOUT.bays,
      gates: BCT_MAIN_DEPOT_LAYOUT.gates,
    };
  }
  return null;
}

/**
 * Project Command `GET /yard/hub` into a Yard bootstrap payload.
 * No demo fleet, trips, or day plan — only live hub data.
 */
export function mapYardHubToBootstrap(
  hub: YardHubResponse,
  companyId: string,
  depotId: string,
  role: YardRole,
): BootstrapPayload {
  const shell = buildLiveBootstrapShell(companyId, depotId || hub.depotId, role);
  const yardLayout = resolveHubLayout(hub);
  const layoutBays = layoutSnapshotToBays(yardLayout);

  const bayIds = new Set((layoutBays.length ? layoutBays : shell.bays).map(b => b.id));
  const extraBays: Bay[] = [];
  const vehicles: Vehicle[] = hub.vehicles.map((row, index) => {
    const zone = mapZone(row);
    let bayId = hubBayToBayId(row.bay);
    if (!bayId || !bayIds.has(bayId)) {
      const zoneBays = (layoutBays.length ? layoutBays : shell.bays).filter(b => b.zone === zone);
      bayId = zoneBays[index % Math.max(zoneBays.length, 1)]?.id ?? `H${String(index + 1).padStart(2, "0")}`;
      if (!bayIds.has(bayId)) {
        bayIds.add(bayId);
        extraBays.push({ id: bayId, zone });
      }
    }

    const status = mapStatus(row);
    return {
      id: String(row.vehicleId),
      reg: String(row.registrationNumber || "—"),
      type: mapVehicleType(row.vehicleCategory),
      bayId,
      status,
      lastCheckAt: row.lastUpdatedAt ?? undefined,
      lastCheckPassed: status === "Available" || status === "On Departure Line" ? true : undefined,
      notes: row.exceptionLabels?.length ? row.exceptionLabels.join(", ") : undefined,
    };
  });

  const hubTasks = (hub.tasks ?? []).map(task => mapHubTask(task, companyId));
  const hubMovements = (hub.movements ?? []).map(mapHubMovement);
  const bodywork = mapBodyworkReports((hub.bodyworkReports ?? []) as HubBodyworkReport[]);
  const hubChecks = (hub.vehicleChecks ?? [])
    .map(row => mapHubVehicleCheck(row as HubVehicleCheck))
    .filter((check): check is YardCheckResult => Boolean(check));

  ingestHubPlatformEvents(hub.platformEvents);

  return {
    ...shell,
    dataSource: COMMAND_HUB_BOOTSTRAP_SOURCE,
    companyId,
    depotId: depotId || hub.depotId || shell.depotId,
    depotCode: hub.depotCode ?? null,
    yardMapEnabled: Boolean(hub.yardMapEnabled || yardLayout),
    yardLayout,
    syncedAt: new Date().toISOString(),
    bays: layoutBays.length ? [...layoutBays, ...extraBays] : [...shell.bays, ...extraBays],
    vehicles,
    tasks: hubTasks,
    movements: hubMovements,
    trips: [],
    defects: [],
    vorCases: [],
    yardChecks: hubChecks,
    damageObservations: bodywork,
    damageReviews: [],
    repairWorkOrders: [],
    operationalPlan: null,
    shiftWindow: hub.shiftLabel ?? shell.shiftWindow,
  };
}
