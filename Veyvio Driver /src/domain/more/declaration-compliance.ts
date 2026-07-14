import type { DeclarationStatement, DriverDeclaration } from "@/types/declarations";

export function getDeclarationProgress(declaration: DriverDeclaration) {
  const total = declaration.statements.length;
  const confirmed = declaration.statements.filter((item) => item.response === "confirmed").length;
  const reported = declaration.statements.filter((item) => item.response === "change_reported").length;

  return { total, confirmed, reported };
}

export function declarationHasReportedChanges(declaration: DriverDeclaration): boolean {
  return declaration.statements.some((item) => item.response === "change_reported");
}

export function declarationCanSubmit(declaration: DriverDeclaration): boolean {
  if (declarationHasReportedChanges(declaration)) return false;
  return declaration.statements.every((item) => item.response === "confirmed");
}

export function declarationStatusLabel(status: DriverDeclaration["status"]): string {
  const labels = {
    due: "Due",
    overdue: "Overdue",
    in_progress: "In progress",
    submitted: "Submitted",
    on_file: "On file",
  } as const;
  return labels[status];
}

export function applyStatementResponse(
  declaration: DriverDeclaration,
  statementId: string,
  response: DeclarationStatement["response"],
): DriverDeclaration {
  const statements = declaration.statements.map((item) =>
    item.id === statementId ? { ...item, response } : item,
  );

  const progress = getDeclarationProgress({ ...declaration, statements });
  const hasReported = statements.some((item) => item.response === "change_reported");

  let status = declaration.status;
  if (declaration.status !== "submitted" && declaration.status !== "on_file") {
    if (hasReported) status = "in_progress";
    else if (progress.confirmed > 0) status = "in_progress";
    else status = declaration.status === "overdue" ? "overdue" : "due";
  }

  return { ...declaration, statements, status };
}

export async function simulateDeclarationSubmit(): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, 900));
}
