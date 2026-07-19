import type { Bay, BayZone, Movement, Vehicle, VehicleStatus } from "@/types/yard";
import { isTaskOpen } from "@/domain/tasks/task-stats";

export interface BayOccupancy {
  bay: Bay;
  vehicle: Vehicle | null;
}

export interface ZoneStats {
  zone: BayZone;
  total: number;
  occupied: number;
  empty: number;
}

const ZONE_ORDER: BayZone[] = [
  "Parking",
  "Departure Line",
  "Wash",
  "Fuel",
  "Inspection",
  "Workshop",
  "Off-site",
];

export function buildBayOccupancy(bays: Bay[], vehicles: Vehicle[]): BayOccupancy[] {
  const byBay = new Map<string, Vehicle>();
  for (const v of vehicles) {
    if (v.status !== "Off-site") byBay.set(v.bayId, v);
  }
  return bays.map(bay => ({ bay, vehicle: byBay.get(bay.id) ?? null }));
}

export function groupBaysByZone(bays: Bay[]): Map<BayZone, Bay[]> {
  const groups = new Map<BayZone, Bay[]>();
  for (const zone of ZONE_ORDER) groups.set(zone, []);
  for (const bay of bays) {
    const list = groups.get(bay.zone) ?? [];
    list.push(bay);
    groups.set(bay.zone, list);
  }
  for (const [, list] of groups) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  return groups;
}

export function zoneOccupancyStats(bays: Bay[], vehicles: Vehicle[]): ZoneStats[] {
  const occupancy = buildBayOccupancy(bays, vehicles);
  const byZone = new Map<BayZone, ZoneStats>();

  for (const zone of ZONE_ORDER) {
    byZone.set(zone, { zone, total: 0, occupied: 0, empty: 0 });
  }

  for (const { bay, vehicle } of occupancy) {
    const stat = byZone.get(bay.zone)!;
    stat.total++;
    if (vehicle) stat.occupied++;
    else stat.empty++;
  }

  return ZONE_ORDER.map(z => byZone.get(z)!);
}

export function getEmptyBaysInZone(bays: Bay[], vehicles: Vehicle[], zone: BayZone): Bay[] {
  const occupied = new Set(vehicles.filter(v => v.status !== "Off-site").map(v => v.bayId));
  return bays.filter(b => b.zone === zone && !occupied.has(b.id));
}

export function getVehiclesInZone(vehicles: Vehicle[], bays: Bay[], zone: BayZone): Vehicle[] {
  const bayIds = new Set(bays.filter(b => b.zone === zone).map(b => b.id));
  return vehicles.filter(v => bayIds.has(v.bayId));
}

export interface AttentionItem {
  id: string;
  tone: "vor" | "warn" | "primary" | "muted";
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
}

export function getAttentionItems(
  vehicles: Vehicle[],
  trips: { ready: boolean; blockers: string[] }[],
  tasks: { priority: string; status: string; dueAt?: string }[] = [],
  damageReviewCount = 0,
  repairVerifyCount = 0,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const openTasks = (tasks ?? []).filter(isTaskOpen);
  const urgentTasks = openTasks.filter(t => t.priority === "Urgent" || t.priority === "High");
  const vor = vehicles.filter(v => v.status === "VOR").length;
  const awaiting = vehicles.filter(v => v.status === "Awaiting Check").length;
  const offSite = vehicles.filter(v => v.status === "Off-site").length;
  const blocked = trips.filter(t => !t.ready).length;

  if (vor > 0) {
    items.push({ id: "vor", tone: "vor", label: `${vor} VOR`, detail: "Vehicles off road", to: "/vor" });
  }
  if (damageReviewCount > 0) {
    items.push({
      id: "damage-review",
      tone: "warn",
      label: `${damageReviewCount} damage review`,
      detail: "Driver reports awaiting Yard",
      to: "/inspections/damage-review",
    });
  }
  if (repairVerifyCount > 0) {
    items.push({
      id: "repair-verify",
      tone: "primary",
      label: `${repairVerifyCount} repair verify`,
      detail: "Post-repair inspections due",
      to: "/inspections/repair-verification",
    });
  }
  if (blocked > 0) {
    items.push({ id: "blocked", tone: "warn", label: `${blocked} blocked`, detail: "Departures not ready", to: "/departure-line" });
  }
  if (awaiting > 0) {
    items.push({ id: "checks", tone: "warn", label: `${awaiting} awaiting check`, detail: "Yard checks due", to: "/checks" });
  }
  if (offSite > 0) {
    items.push({ id: "arrivals", tone: "primary", label: `${offSite} off-site`, detail: "Record arrivals", to: "/arrivals" });
  }
  if (urgentTasks.length > 0) {
    items.push({ id: "tasks", tone: "warn", label: `${urgentTasks.length} urgent tasks`, detail: "Yard work due", to: "/tasks" });
  }
  return items;
}

export const STATUS_BAY_TONE: Record<VehicleStatus, string> = {
  "Available": "bg-ok/15 border-ok/30 text-ok",
  "Awaiting Check": "bg-warn/15 border-warn/40 text-warn",
  "On Departure Line": "bg-primary/15 border-primary/30 text-primary",
  "In Workshop": "bg-secondary border-border text-muted",
  "VOR": "bg-vor/15 border-vor/30 text-vor",
  "Off-site": "bg-secondary border-border text-muted",
};

export function recentArrivals(movements: Movement[], limit = 5): Movement[] {
  return movements
    .filter(m => m.reason === "Return from off-site" || m.reason === "Move to parking")
    .slice(0, limit);
}
