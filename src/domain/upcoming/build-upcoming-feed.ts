import { buildComplianceUpcomingItems } from "@/data/upcoming-compliance-fixtures";
import type { YardTask } from "@/types/tasks";
import type { Defect, Movement, Vehicle } from "@/types/yard";
import type { UpcomingCategory, UpcomingItem, UpcomingPriority } from "@/types/upcoming";
import { classifyDueBucket, priorityFromDue } from "./upcoming-scheduling";

const INACTIVE_MS = 72 * 60 * 60 * 1000;
const IGNORED_VEHICLE_STATUSES = new Set(["VOR", "Off-site", "In Workshop"]);

export type UpcomingFeedInput = {
  tasks: YardTask[];
  vehicles: Vehicle[];
  defects: Defect[];
  movements: Movement[];
  includeComplianceFixtures?: boolean;
  now?: Date;
};

function taskCategory(kind: YardTask["kind"]): UpcomingCategory {
  switch (kind) {
    case "check":
    case "inspection":
      return "safety_inspection";
    case "defect":
      return "defect";
    case "equipment":
      return "equipment";
    default:
      return "yard_task";
  }
}

function mapTaskToUpcoming(task: YardTask, vehicle?: Vehicle, now = new Date()): UpcomingItem | null {
  if (task.status === "completed" || task.status === "cancelled") return null;
  if (!task.dueAt && task.priority !== "Urgent") return null;

  const dueAt = task.dueAt ?? now.toISOString();
  const priority: UpcomingPriority =
    task.priority === "Urgent" ? "critical"
    : task.priority === "High" ? "urgent"
    : priorityFromDue(dueAt, {}, now);

  return {
    id: `task-${task.id}`,
    category: taskCategory(task.kind),
    title: task.title,
    subtitle: vehicle ? `${vehicle.reg} · Bay ${vehicle.bayId}` : undefined,
    detailLines: task.description ? [task.description] : [],
    vehicleId: task.vehicleId,
    vehicleReg: vehicle?.reg,
    bayId: vehicle?.bayId,
    dueAt: task.dueAt,
    priority,
    bucket: classifyDueBucket(dueAt, now),
    statusLabel: task.status.replace("_", " "),
    execution: "yard_team",
    blocksAllocation: task.priority === "Urgent",
    evidenceMissing: false,
    needsBooking: false,
    yardTaskId: task.id,
    defectId: task.defectId,
    source: "task",
  };
}

function mapDefectToUpcoming(defect: Defect, vehicle: Vehicle | undefined, now = new Date()): UpcomingItem {
  const dueAt = defect.raisedAt;
  const safetyCritical = defect.severity === "Safety-critical";
  return {
    id: `defect-${defect.id}`,
    category: defect.category.toLowerCase().includes("tyre") ? "tyre" : "defect",
    title: `${defect.category} defect — follow-up`,
    subtitle: vehicle?.reg,
    detailLines: [defect.notes],
    vehicleId: defect.vehicleId,
    vehicleReg: vehicle?.reg,
    bayId: vehicle?.bayId,
    dueAt,
    priority: priorityFromDue(dueAt, { safetyCritical, blocksAllocation: safetyCritical }, now),
    bucket: classifyDueBucket(dueAt, now),
    statusLabel: defect.severity,
    execution: safetyCritical ? "external_garage" : "yard_team",
    blocksAllocation: safetyCritical,
    evidenceMissing: false,
    needsBooking: false,
    defectId: defect.id,
    source: "defect",
  };
}

function mapAwaitingCheckVehicle(vehicle: Vehicle, now = new Date()): UpcomingItem {
  const dueAt = now.toISOString();
  return {
    id: `vehicle-check-${vehicle.id}`,
    category: "weekly_check",
    title: "Vehicle check required",
    subtitle: `${vehicle.reg} · Bay ${vehicle.bayId}`,
    detailLines: ["Vehicle is awaiting check before allocation"],
    vehicleId: vehicle.id,
    vehicleReg: vehicle.reg,
    bayId: vehicle.bayId,
    dueAt,
    priority: "urgent",
    bucket: "today",
    statusLabel: "Awaiting check",
    execution: "yard_team",
    blocksAllocation: true,
    evidenceMissing: false,
    needsBooking: false,
    source: "vehicle",
  };
}

function lastActivityAt(vehicle: Vehicle, movements: Movement[]): number | null {
  const vehicleMovements = movements
    .filter(m => m.vehicleId === vehicle.id)
    .map(m => new Date(m.at).getTime())
    .filter(t => !Number.isNaN(t));
  const checkAt = vehicle.lastCheckAt ? new Date(vehicle.lastCheckAt).getTime() : null;
  const latestMovement = vehicleMovements.length ? Math.max(...vehicleMovements) : null;
  const candidates = [checkAt, latestMovement].filter((t): t is number => t != null);
  return candidates.length ? Math.max(...candidates) : null;
}

function mapInactiveVehicle(
  vehicle: Vehicle,
  movements: Movement[],
  now = new Date(),
): UpcomingItem | null {
  if (IGNORED_VEHICLE_STATUSES.has(vehicle.status)) return null;
  const lastAt = lastActivityAt(vehicle, movements);
  if (lastAt == null) return null;
  if (now.getTime() - lastAt < INACTIVE_MS) return null;

  const inactiveDays = Math.floor((now.getTime() - lastAt) / (24 * 60 * 60 * 1000));
  const dueAt = now.toISOString();
  return {
    id: `inactive-${vehicle.id}`,
    category: "inactive_vehicle",
    title: "Inactive vehicle check",
    subtitle: `${vehicle.reg} · Bay ${vehicle.bayId}`,
    detailLines: [
      `No completed work for ${inactiveDays} days`,
      `Last activity: ${new Date(lastAt).toLocaleString("en-GB")}`,
    ],
    vehicleId: vehicle.id,
    vehicleReg: vehicle.reg,
    bayId: vehicle.bayId,
    dueAt,
    priority: inactiveDays >= 5 ? "urgent" : "upcoming",
    bucket: inactiveDays >= 3 ? "today" : "week",
    statusLabel: `Inactive ${inactiveDays} days`,
    execution: "yard_team",
    blocksAllocation: false,
    evidenceMissing: false,
    needsBooking: false,
    source: "inactivity",
  };
}

function priorityRank(priority: UpcomingItem["priority"]): number {
  switch (priority) {
    case "critical":
      return 0;
    case "urgent":
      return 1;
    case "upcoming":
      return 2;
    default:
      return 3;
  }
}

export function buildUpcomingFeed(input: UpcomingFeedInput): UpcomingItem[] {
  const now = input.now ?? new Date();
  const vehicleById = new Map(input.vehicles.map(v => [v.id, v]));
  const items: UpcomingItem[] = [];

  for (const task of input.tasks) {
    const mapped = mapTaskToUpcoming(task, task.vehicleId ? vehicleById.get(task.vehicleId) : undefined, now);
    if (mapped) items.push(mapped);
  }

  for (const defect of input.defects.filter(d => !d.resolved)) {
    items.push(mapDefectToUpcoming(defect, vehicleById.get(defect.vehicleId), now));
  }

  for (const vehicle of input.vehicles.filter(v => v.status === "Awaiting Check")) {
    items.push(mapAwaitingCheckVehicle(vehicle, now));
  }

  for (const vehicle of input.vehicles) {
    const inactive = mapInactiveVehicle(vehicle, input.movements, now);
    if (inactive) items.push(inactive);
  }

  if (input.includeComplianceFixtures !== false) {
    items.push(...buildComplianceUpcomingItems(input.vehicles, now));
  }

  const deduped = new Map<string, UpcomingItem>();
  for (const item of items) {
    const key = `${item.category}:${item.vehicleId ?? item.id}`;
    const existing = deduped.get(key);
    if (!existing || priorityRank(item.priority) < priorityRank(existing.priority)) {
      deduped.set(key, item);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
}

export function filterUpcomingFeed(
  items: UpcomingItem[],
  filters: {
    bucket?: UpcomingItem["bucket"] | "all";
    category?: UpcomingCategory | "all";
    vehicleId?: string | "all";
    execution?: UpcomingItem["execution"] | "all";
    yardTeamOnly?: boolean;
    assignedToMe?: boolean;
  },
): UpcomingItem[] {
  return items.filter(item => {
    if (filters.bucket && filters.bucket !== "all" && item.bucket !== filters.bucket) return false;
    if (filters.category && filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.vehicleId && filters.vehicleId !== "all" && item.vehicleId !== filters.vehicleId) return false;
    if (filters.execution && filters.execution !== "all" && item.execution !== filters.execution) return false;
    if (filters.yardTeamOnly && item.execution !== "yard_team") return false;
    return true;
  });
}
