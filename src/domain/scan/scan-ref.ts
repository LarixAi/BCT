import type { Bay } from "@/types/yard";
import type { YardTask } from "@/types/tasks";

export interface ScanEntityRef {
  kind: "task" | "defect" | "vehicle" | "bay";
  id: string;
}

export interface ScanTarget {
  to: string;
  params?: Record<string, string>;
}

interface ResolveScanContext {
  vehicles: { id: string; reg: string; bayId: string }[];
  defects: { id: string }[];
  tasks: YardTask[];
  bays: Bay[];
}

const ENTITY_PATTERNS: { kind: ScanEntityRef["kind"]; pattern: RegExp }[] = [
  { kind: "task", pattern: /^(?:veyvio:)?task[:\/]([a-z0-9_]+)$/i },
  { kind: "defect", pattern: /^(?:veyvio:)?defect[:\/]([a-z0-9_]+)$/i },
  { kind: "vehicle", pattern: /^(?:veyvio:)?vehicle[:\/]([a-z0-9_]+)$/i },
  { kind: "bay", pattern: /^(?:veyvio:)?bay[:\/]([a-z0-9_]+)$/i },
];

export function parseScanEntityRef(input: string): ScanEntityRef | null {
  const trimmed = input.trim();
  for (const { kind, pattern } of ENTITY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return { kind, id: match[1] };
  }
  return null;
}

export function resolveScanTarget(input: string, ctx: ResolveScanContext): ScanTarget | null {
  const trimmed = input.trim();
  const entity = parseScanEntityRef(trimmed);
  if (entity) {
    switch (entity.kind) {
      case "task":
        if (!ctx.tasks.some(t => t.id === entity.id)) return null;
        return { to: "/tasks/$taskId", params: { taskId: entity.id } };
      case "defect":
        if (!ctx.defects.some(d => d.id === entity.id)) return null;
        return { to: "/defects/$defectId", params: { defectId: entity.id } };
      case "vehicle":
        if (!ctx.vehicles.some(v => v.id === entity.id)) return null;
        return { to: "/yard/$vehicleId", params: { vehicleId: entity.id } };
      case "bay":
        if (!ctx.bays.some(b => b.id === entity.id)) return null;
        return { to: "/yard/map" };
    }
  }

  const vehicle = ctx.vehicles.find(v =>
    v.reg.replace(/\s/g, "").toLowerCase() === trimmed.replace(/\s/g, "").toLowerCase()
    || v.id.toLowerCase() === trimmed.toLowerCase()
    || v.bayId.toLowerCase() === trimmed.toLowerCase(),
  );
  if (vehicle) {
    return { to: "/yard/$vehicleId", params: { vehicleId: vehicle.id } };
  }

  return null;
}

export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}
