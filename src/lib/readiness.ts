import type {
  ReadinessResult,
  ReadinessState,
  Requirement,
  VehicleEquipment,
} from "@/types/equipment";
import type { Vehicle } from "@/types/yard";
import { REQUIREMENTS_BY_TYPE } from "@/data/equipment-fixtures";

function ok(status: string) {
  return status === "present" || status === "complete";
}

function evaluate(req: Requirement, eq: VehicleEquipment):
  { level: "ok" | "warn" | "restrict" | "block" | "info"; detail?: string } {
  switch (req.category) {
    case "fixed": {
      const items = eq.fixed.filter(i => i.defId === req.key);
      if (items.length === 0) return { level: req.departureRule === "block" ? "block" : "warn", detail: `${req.label} missing` };
      const worst = items.find(i => i.status === "missing" || i.status === "damaged" || i.status === "expired" || i.status === "incomplete");
      if (worst) {
        const detail = `${worst.label} ${worst.status}`;
        if (req.departureRule === "block") return { level: "block", detail };
        if (req.departureRule === "restrict") return { level: "restrict", detail };
        return { level: "warn", detail };
      }
      const expiring = items.find(i => i.status === "expiring" || i.status === "inspection-due");
      if (expiring) return { level: "warn", detail: `${expiring.label} ${expiring.status}` };
      return { level: "ok" };
    }
    case "reusable": {
      const items = eq.assigned.filter(i => i.defId === req.key);
      if (items.length === 0) {
        if (req.departureRule === "block") return { level: "block", detail: `${req.label} not assigned` };
        if (req.departureRule === "restrict") return { level: "restrict", detail: `${req.label} not assigned` };
        return { level: "warn", detail: `${req.label} not assigned` };
      }
      const bad = items.find(i => i.status === "incomplete" || i.status === "damaged" || i.status === "missing");
      if (bad) {
        const missingComp = bad.components?.filter(c => !c.present).map(c => c.label).join(", ");
        const detail = `${bad.label} ${bad.status}${missingComp ? ` (${missingComp})` : ""}`;
        if (req.departureRule === "block") return { level: "block", detail };
        if (req.departureRule === "restrict") return { level: "restrict", detail };
        return { level: "warn", detail };
      }
      return { level: "ok" };
    }
    case "consumable": {
      const line = eq.consumables.find(c => c.defId === req.key);
      const min = req.minQty ?? line?.target ?? 0;
      if (!line || line.current <= 0) {
        if (req.departureRule === "block") return { level: "block", detail: `${req.label} missing` };
        return { level: "warn", detail: `${req.label} missing` };
      }
      if (line.current < min) return { level: "warn", detail: `${req.label} low (${line.current}/${min})` };
      return { level: "ok" };
    }
    case "document": {
      const doc = eq.documents.find(d => d.id.startsWith(req.key.slice(0, 2).toUpperCase()) || d.label.toLowerCase() === req.label.toLowerCase());
      if (!doc || doc.status === "missing") {
        if (req.departureRule === "block") return { level: "block", detail: `${req.label} missing` };
        return { level: "warn", detail: `${req.label} missing` };
      }
      return { level: "ok" };
    }
  }
}

export function computeReadiness(vehicle: Vehicle, eq: VehicleEquipment | undefined): ReadinessResult {
  const reqs = REQUIREMENTS_BY_TYPE[vehicle.type] ?? [];
  if (!eq) {
    return { state: "unknown", totals: { complete: 0, total: reqs.length }, blockers: [], restrictions: [], warnings: [], summary: "No equipment data" };
  }
  const blockers: string[] = [];
  const restrictions: string[] = [];
  const warnings: string[] = [];
  let complete = 0;

  for (const req of reqs) {
    const r = evaluate(req, eq);
    if (r.level === "ok") complete++;
    else if (r.level === "block") blockers.push(r.detail ?? req.label);
    else if (r.level === "restrict") restrictions.push(`${req.serviceRestriction ? `No ${req.serviceRestriction} journeys — ` : ""}${r.detail ?? req.label}`);
    else if (r.level === "warn") warnings.push(r.detail ?? req.label);
  }

  let state: ReadinessState = "ready";
  if (vehicle.status === "VOR") state = "vor";
  else if (blockers.length) state = "blocked";
  else if (restrictions.length) state = "restricted";
  else if (warnings.length) state = "warnings";

  let summary: string;
  if (state === "vor") summary = "Off-road";
  else if (blockers.length) summary = `Safety failure · ${blockers[0]}`;
  else if (restrictions.length) summary = `Restricted · ${restrictions[0]}`;
  else if (warnings.length) summary = warnings.length === 1 ? warnings[0] : `${warnings.length} warnings · ${warnings[0]}`;
  else summary = `${complete}/${reqs.length} complete`;

  return { state, totals: { complete, total: reqs.length }, blockers, restrictions, warnings, summary };
}

export const READINESS_TONE: Record<ReadinessState, { bg: string; text: string; border: string; label: string }> = {
  ready:      { bg: "bg-ok/10",      text: "text-ok",      border: "border-ok/30",     label: "Ready" },
  warnings:   { bg: "bg-warn/10",    text: "text-warn", border: "border-warn/40", label: "Warnings" },
  restricted: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", label: "Restricted" },
  blocked:    { bg: "bg-vor/10",     text: "text-vor",     border: "border-vor/30",    label: "Blocked" },
  vor:        { bg: "bg-vor/10",     text: "text-vor",     border: "border-vor/30",    label: "VOR" },
  unknown:    { bg: "bg-secondary",  text: "text-muted",   border: "border-border",    label: "—" },
};
