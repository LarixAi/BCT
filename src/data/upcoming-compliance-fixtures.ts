import type { Vehicle } from "@/types/yard";
import type { UpcomingItem } from "@/types/upcoming";
import { classifyDueBucket, priorityFromDue } from "@/domain/upcoming/upcoming-scheduling";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(base: Date, days: number): string {
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

function findVehicle(vehicles: Vehicle[], reg: string): Vehicle | undefined {
  return vehicles.find(v => v.reg.replace(/\s/g, "").toUpperCase() === reg.replace(/\s/g, "").toUpperCase());
}

/** Demo compliance rows until vehicle MOT/PMI dates exist on the hub. */
export function buildComplianceUpcomingItems(vehicles: Vehicle[], now = new Date()): UpcomingItem[] {
  const items: UpcomingItem[] = [];

  const motVehicle = findVehicle(vehicles, "FH24 NLM") ?? vehicles.find(v => v.status === "Available");
  if (motVehicle) {
    const dueAt = addDays(now, 1);
    items.push({
      id: `compliance-mot-${motVehicle.id}`,
      category: "mot",
      title: "MOT expires tomorrow",
      subtitle: motVehicle.reg,
      detailLines: ["Booking required", "Evidence missing until certificate uploaded"],
      vehicleId: motVehicle.id,
      vehicleReg: motVehicle.reg,
      bayId: motVehicle.bayId,
      dueAt,
      priority: priorityFromDue(dueAt, { blocksAllocation: true }, now),
      bucket: classifyDueBucket(dueAt, now),
      statusLabel: "Booking required",
      execution: "external_garage",
      blocksAllocation: true,
      evidenceMissing: true,
      needsBooking: true,
      source: "compliance_rule",
    });
  }

  const retorqueVehicle = findVehicle(vehicles, "BU19 HJK") ?? vehicles[0];
  if (retorqueVehicle) {
    const dueAt = addDays(now, 0);
    items.push({
      id: `compliance-retorque-${retorqueVehicle.id}`,
      category: "wheel_nut_retorque",
      title: "Wheel-nut re-torque overdue",
      subtitle: `${retorqueVehicle.reg} · Rear near-side wheel`,
      detailLines: [
        "Wheel fitted: 22 Jul 2026",
        "Re-torque due today or at 52,430 miles",
        "Current mileage: 52,426 · 4 miles remaining",
      ],
      vehicleId: retorqueVehicle.id,
      vehicleReg: retorqueVehicle.reg,
      bayId: retorqueVehicle.bayId,
      dueAt,
      dueMileage: 52430,
      currentMileage: 52426,
      priority: "urgent",
      bucket: classifyDueBucket(dueAt, now),
      statusLabel: "Overdue",
      execution: "yard_team",
      blocksAllocation: false,
      evidenceMissing: false,
      needsBooking: false,
      source: "compliance_rule",
    });
  }

  const inactiveVehicle =
    vehicles.find(v => v.status === "Available" && !v.lastCheckAt) ??
    vehicles.find(v => v.reg === "GJ21 QRS");
  if (inactiveVehicle) {
    const dueAt = addDays(now, 0);
    const lastMovement = addDays(now, -3);
    items.push({
      id: `compliance-inactive-${inactiveVehicle.id}`,
      category: "inactive_vehicle",
      title: "Inactive vehicle check",
      subtitle: `${inactiveVehicle.reg} · Bay ${inactiveVehicle.bayId}`,
      detailLines: [
        "No completed work for 3 days",
        `Last movement: ${new Date(lastMovement).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        "Last mileage: 41,822",
      ],
      vehicleId: inactiveVehicle.id,
      vehicleReg: inactiveVehicle.reg,
      bayId: inactiveVehicle.bayId,
      dueAt,
      priority: "urgent",
      bucket: "today",
      statusLabel: "Due today",
      execution: "yard_team",
      blocksAllocation: false,
      evidenceMissing: false,
      needsBooking: false,
      source: "inactivity",
    });
  }

  const inspectionVehicle = findVehicle(vehicles, "SK23 FGH");
  if (inspectionVehicle) {
    const dueAt = addDays(now, 0);
    items.push({
      id: `compliance-inspection-${inspectionVehicle.id}`,
      category: "safety_inspection",
      title: "Safety inspection",
      subtitle: `${inspectionVehicle.reg} · Bay ${inspectionVehicle.bayId}`,
      detailLines: ["Operator scheduled inspection due this shift"],
      vehicleId: inspectionVehicle.id,
      vehicleReg: inspectionVehicle.reg,
      bayId: inspectionVehicle.bayId,
      dueAt,
      priority: priorityFromDue(dueAt, {}, now),
      bucket: classifyDueBucket(dueAt, now),
      statusLabel: "Due today",
      execution: "authorised_inspector",
      blocksAllocation: true,
      evidenceMissing: false,
      needsBooking: false,
      source: "compliance_rule",
    });
  }

  const weeklyVehicle = findVehicle(vehicles, "YN22 ZTM");
  if (weeklyVehicle) {
    const dueAt = addDays(now, 2);
    items.push({
      id: `compliance-weekly-${weeklyVehicle.id}`,
      category: "weekly_check",
      title: "Weekly vehicle check",
      subtitle: weeklyVehicle.reg,
      detailLines: ["Extended walk-around due this week"],
      vehicleId: weeklyVehicle.id,
      vehicleReg: weeklyVehicle.reg,
      bayId: weeklyVehicle.bayId,
      dueAt,
      priority: priorityFromDue(dueAt, {}, now),
      bucket: classifyDueBucket(dueAt, now),
      statusLabel: "Due in 2 days",
      execution: "yard_team",
      blocksAllocation: false,
      evidenceMissing: false,
      needsBooking: false,
      source: "compliance_rule",
    });
  }

  return items;
}
