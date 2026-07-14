import type { DeclarationStatement } from "@/types/declarations";

export interface DeclarationStatementDefinition {
  id: string;
  label: string;
  confirmText: string;
  reportChangeLabel?: string;
  allowsReportChange?: boolean;
}

export const ANNUAL_DRIVER_DECLARATION_V1: DeclarationStatementDefinition[] = [
  {
    id: "licence_status",
    label: "Driving licence",
    confirmText:
      "My photocard licence is valid for the vehicle categories I drive. I have told operations about any changes.",
    reportChangeLabel: "Licence status has changed",
    allowsReportChange: true,
  },
  {
    id: "convictions",
    label: "Driving convictions and endorsements",
    confirmText:
      "I have no new convictions, endorsements, or fixed penalties to report since my last declaration.",
    reportChangeLabel: "I need to report a conviction or endorsement",
    allowsReportChange: true,
  },
  {
    id: "medical_fitness",
    label: "Medical fitness",
    confirmText:
      "There is no medical change affecting my fitness to drive passenger transport.",
    reportChangeLabel: "My medical fitness has changed",
    allowsReportChange: true,
  },
  {
    id: "company_policies",
    label: "Company policies",
    confirmText: "I have read and understood the operator policies that apply to my duties.",
    allowsReportChange: false,
  },
  {
    id: "fitness_to_drive",
    label: "Fitness to drive",
    confirmText:
      "I am fit to drive today and will not drive if fatigue, medication, or illness could affect safety.",
    allowsReportChange: false,
  },
];

export function buildDeclarationStatements(
  definitions: DeclarationStatementDefinition[],
): DeclarationStatement[] {
  return definitions.map((definition) => ({
    ...definition,
    response: "unanswered",
  }));
}
