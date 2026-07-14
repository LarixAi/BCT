import { getSectionDef } from "@/domain/yard/check-templates";
import type { YardCheckSectionResult } from "@/types/yard-check";

/** Safety-critical defect marked unsafe to move → formal VOR case required. */
export function shouldAutoVorFromSection(section: YardCheckSectionResult): boolean {
  if (section.outcome !== "defect" || section.safeToMove !== false) return false;
  const def = getSectionDef(section.sectionId);
  return !!def?.safetyCritical;
}

export function sectionsRequiringVor(sections: YardCheckSectionResult[]): YardCheckSectionResult[] {
  return sections.filter(shouldAutoVorFromSection);
}
