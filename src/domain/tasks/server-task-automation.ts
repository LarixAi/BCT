import type { Defect, Vehicle, VorCase } from "@/types/yard";

/** Extract defect reference embedded in yard_tasks.instructions for dedupe. */
export function parseDefectIdFromTaskInstructions(instructions?: string | null): string | undefined {
  if (!instructions) return undefined;
  const uuidMatch = instructions.match(
    /\(([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/i,
  );
  if (uuidMatch?.[1]) return uuidMatch[1];
  const localMatch = instructions.match(/defect \(([a-zA-Z0-9_-]+)\)/i);
  return localMatch?.[1];
}

function mapDefectPriority(severity: Defect["severity"]): string {
  if (severity === "Safety-critical") return "urgent";
  if (severity === "Major") return "important";
  return "routine";
}

export function buildServerDefectTaskPayload(defect: Defect, vehicle?: Vehicle) {
  const reg = vehicle?.reg ?? defect.vehicleId;
  const critical = defect.severity === "Safety-critical";
  return {
    vehicleId: defect.vehicleId,
    taskType: critical ? "quarantine_vehicle" : "inspect_damage",
    title: critical
      ? `Urgent damage inspection — ${reg}`
      : `Investigate ${defect.category.toLowerCase()} defect — ${reg}`,
    priority: mapDefectPriority(defect.severity),
    instructions: `Yard-reported defect (${defect.id}). ${defect.notes}`.slice(0, 500),
    evidenceRequired: critical,
    blockingRelease: critical,
    defectId: defect.id,
  };
}

export function buildServerVorTaskPayload(
  vorCase: VorCase,
  vehicle?: Vehicle,
  defect?: Defect | null,
) {
  const reg = vehicle?.reg ?? vorCase.vehicleId;
  const linkedDefectId = defect?.id ?? vorCase.defectId;
  return {
    vehicleId: vorCase.vehicleId,
    taskType: "inspect_damage",
    title: `Confirm VOR — ${reg}`,
    priority: "urgent",
    instructions: `VOR case (${vorCase.id})${linkedDefectId ? ` for defect (${linkedDefectId})` : ""}. ${vorCase.reason}`.slice(
      0,
      500,
    ),
    evidenceRequired: true,
    blockingRelease: true,
    defectId: linkedDefectId,
  };
}
