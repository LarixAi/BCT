import type { Defect, VorCase } from "@/types/yard";

export function buildVorCaseFromDefect(
  defect: Defect,
  actor: string,
  openedAt: string,
  nextId: (prefix: string) => string,
): VorCase {
  return {
    id: nextId("vor"),
    vehicleId: defect.vehicleId,
    defectId: defect.id,
    lifecycle: "Potential",
    reason: `${defect.category}: ${defect.notes}`,
    openedAt,
    history: [{ at: openedAt, by: actor, from: null, to: "Potential" }],
  };
}
