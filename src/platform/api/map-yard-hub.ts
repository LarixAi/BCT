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
import type { Bay, BayZone, Movement, MovementReason, Vehicle, VehicleStatus, VehicleType } from "@/types/yard";

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

  const bayIds = new Set(shell.bays.map(b => b.id));
  const extraBays: Bay[] = [];
  const vehicles: Vehicle[] = hub.vehicles.map((row, index) => {
    const zone = mapZone(row);
    let bayId = row.bay && String(row.bay).trim() ? String(row.bay) : "";
    if (!bayId || !bayIds.has(bayId)) {
      const zoneBays = shell.bays.filter(b => b.zone === zone);
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
      fuelPct: 50,
      lastCheckAt: row.lastUpdatedAt ?? undefined,
      lastCheckPassed: status === "Available" || status === "On Departure Line" ? true : undefined,
      notes: row.exceptionLabels?.length ? row.exceptionLabels.join(", ") : undefined,
    };
  });

  const hubTasks = (hub.tasks ?? []).map(task => mapHubTask(task, companyId));
  const hubMovements = (hub.movements ?? []).map(mapHubMovement);
  const bodywork = mapBodyworkReports((hub.bodyworkReports ?? []) as HubBodyworkReport[]);

  return {
    ...shell,
    dataSource: COMMAND_HUB_BOOTSTRAP_SOURCE,
    companyId,
    depotId: depotId || hub.depotId || shell.depotId,
    syncedAt: new Date().toISOString(),
    bays: [...shell.bays, ...extraBays],
    vehicles,
    tasks: hubTasks,
    movements: hubMovements,
    trips: [],
    defects: [],
    vorCases: [],
    yardChecks: [],
    damageObservations: bodywork,
    damageReviews: [],
    repairWorkOrders: [],
    operationalPlan: null,
    shiftWindow: hub.shiftLabel ?? shell.shiftWindow,
  };
}
