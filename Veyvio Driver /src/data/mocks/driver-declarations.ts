import {
  ANNUAL_DRIVER_DECLARATION_V1,
  buildDeclarationStatements,
} from "@/domain/more/declaration-catalog";
import type { DriverDeclaration, DriverDeclarationsPayload } from "@/types/declarations";

export function buildMockDeclarations(): DriverDeclarationsPayload {
  return {
    declarations: [
      {
        id: "decl_annual_2026",
        title: "Annual driver declaration",
        version: "2026.1",
        periodLabel: "Annual · 2026",
        dueDate: "2026-12-31",
        status: "due",
        summary:
          "Confirm licence status, convictions, medical fitness, policy understanding, and fitness to drive.",
        statements: buildDeclarationStatements(ANNUAL_DRIVER_DECLARATION_V1),
      },
      {
        id: "decl_fitness_q2",
        title: "Quarterly fitness confirmation",
        version: "2026.Q2",
        periodLabel: "Quarter 2 · 2026",
        dueDate: "2026-06-30",
        status: "on_file",
        summary: "Short fitness and fatigue confirmation for the current quarter.",
        statements: buildDeclarationStatements(ANNUAL_DRIVER_DECLARATION_V1.slice(4)).map((item) => ({
          ...item,
          response: "confirmed" as const,
        })),
        submittedAt: "2026-04-02T08:15:00.000Z",
        submittedBy: "Larone Laing",
        auditNote: "Recorded on device · declaration version 2026.Q2",
      },
    ],
  };
}

export function getDeclarationById(declarationId: string): DriverDeclaration | undefined {
  return buildMockDeclarations().declarations.find((item) => item.id === declarationId);
}

export function countDueDeclarations(declarations: DriverDeclaration[]): number {
  return declarations.filter((item) => item.status === "due" || item.status === "overdue").length;
}
