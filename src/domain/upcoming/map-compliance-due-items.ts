import type { Vehicle } from "@/types/yard";
import type { UpcomingItem } from "@/types/upcoming";
import { classifyDueBucket, priorityFromDue } from "@/domain/upcoming/upcoming-scheduling";

/** Authoritative compliance due row from Command (vehicle dates or compliance API). */
export type ComplianceDueItem = {
  id: string;
  entityType: "vehicle" | "driver" | string;
  entityId: string;
  entityLabel?: string | null;
  documentType: string;
  expiryDate: string;
  source?: string;
};

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }
  return new Date(trimmed).toISOString();
}

/**
 * Map Command compliance due items into Upcoming rows.
 * Only vehicle MOT / wheel re-torque are projected into Yard Upcoming for now.
 */
export function mapComplianceDueItemsToUpcoming(
  items: ComplianceDueItem[],
  vehicles: Vehicle[],
  now = new Date(),
): UpcomingItem[] {
  const byId = new Map(vehicles.map(v => [v.id, v]));
  const byReg = new Map(
    vehicles.map(v => [v.reg.replace(/\s/g, "").toUpperCase(), v]),
  );

  const out: UpcomingItem[] = [];
  for (const item of items) {
    if (item.entityType !== "vehicle") continue;
    const doc = item.documentType.toLowerCase();
    const isMot = doc.includes("mot");
    const isRetorque = doc.includes("re-torque") || doc.includes("retorque");
    if (!isMot && !isRetorque) continue;

    const vehicle =
      byId.get(item.entityId) ??
      (item.entityLabel
        ? byReg.get(item.entityLabel.replace(/\s/g, "").toUpperCase())
        : undefined);

    const dueAt = normalizeDate(item.expiryDate);
    const category = isMot ? "mot" : "wheel_nut_retorque";
    const title = isMot
      ? `MOT due ${item.expiryDate.slice(0, 10)}`
      : `Wheel-nut re-torque due ${item.expiryDate.slice(0, 10)}`;

    out.push({
      id: item.id,
      category,
      title,
      subtitle: vehicle?.reg ?? item.entityLabel ?? undefined,
      detailLines: item.source ? [`Source: ${item.source}`] : ["From Command compliance dates"],
      vehicleId: vehicle?.id ?? item.entityId,
      vehicleReg: vehicle?.reg ?? item.entityLabel ?? undefined,
      bayId: vehicle?.bayId,
      dueAt,
      priority: priorityFromDue(dueAt, { blocksAllocation: isMot }, now),
      bucket: classifyDueBucket(dueAt, now),
      statusLabel: new Date(dueAt).getTime() < now.getTime() ? "Overdue" : "Due",
      execution: isMot ? "external_garage" : "yard_team",
      blocksAllocation: isMot,
      evidenceMissing: false,
      needsBooking: isMot,
      source: "compliance_rule",
    });
  }
  return out;
}
