import type { DefectSeverity } from "@/types/yard";
import type { CheckSafetyOutcome, SectionOutcome, YardCheckSectionResult } from "@/types/yard-check";
import { getSectionDef } from "@/domain/yard/check-templates";

export function computeSafetyOutcome(sections: YardCheckSectionResult[]): CheckSafetyOutcome {
  const defects = sections.filter(s => s.outcome === "defect");
  if (defects.length === 0) return "ready";

  let hasSafetyCritical = false;
  let hasUnsafe = false;

  for (const s of defects) {
    const def = getSectionDef(s.sectionId);
    if (def?.safetyCritical) hasSafetyCritical = true;
    if (s.safeToMove === false) hasUnsafe = true;
  }

  if (hasSafetyCritical && hasUnsafe) return "vor";
  if (hasSafetyCritical || hasUnsafe) return "hold";
  return "attention";
}

export function computeOverallPassed(sections: YardCheckSectionResult[]): boolean {
  return sections.every(s => s.outcome === "passed" || s.outcome === "na");
}

export function severityForSection(sectionId: string): DefectSeverity {
  const def = getSectionDef(sectionId);
  if (def?.safetyCritical) return "Safety-critical";
  if (def?.module === "roadworthiness" || def?.module === "yard-audit") return "Major";
  return "Minor";
}

export function sectionRequiresDrillDown(outcome: SectionOutcome): boolean {
  return outcome === "defect";
}

export const SAFETY_OUTCOME_LABEL: Record<CheckSafetyOutcome, string> = {
  ready: "Green — Ready",
  attention: "Amber — Attention required",
  hold: "Red — Hold vehicle",
  vor: "VOR — Off road",
};

export const SAFETY_OUTCOME_TONE: Record<CheckSafetyOutcome, string> = {
  ready: "text-ok border-ok/30 bg-ok/10",
  attention: "text-warn border-warn/40 bg-warn/10",
  hold: "text-vor border-vor/30 bg-vor/10",
  vor: "text-vor border-vor/30 bg-vor/15",
};
