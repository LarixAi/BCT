import type { Defect, VorCase } from "@/types/yard";

export interface ResolveDefectCheck {
  ok: boolean;
  reason?: string;
}

export function canResolveDefect(defect: Defect, vorCase?: VorCase): ResolveDefectCheck {
  if (defect.resolved) {
    return { ok: false, reason: "Defect is already resolved" };
  }
  if (defect.vorCaseId && vorCase && vorCase.lifecycle !== "Cleared") {
    return { ok: false, reason: "Clear the linked VOR case before resolving this defect" };
  }
  return { ok: true };
}

export function applyResolveDefect(
  defect: Defect,
  resolvedBy: string,
  resolvedAt: string,
  resolutionNote?: string,
): Defect {
  return {
    ...defect,
    resolved: true,
    resolvedAt,
    resolvedBy,
    resolutionNote: resolutionNote?.trim() || undefined,
  };
}
