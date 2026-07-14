/** Check section IDs that should surface the vehicle Condition panel during yard checks. */
export const BODYWORK_LINKED_SECTIONS = new Set([
  "body-exterior",
  "tyres-wheels",
  "lights-indicators",
  "windscreen",
  "registration-plates",
  "audit-bodywork",
  "audit-tyres",
  "audit-lights",
]);

export function isBodyworkLinkedSection(sectionId: string): boolean {
  return BODYWORK_LINKED_SECTIONS.has(sectionId);
}
