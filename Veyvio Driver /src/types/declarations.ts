export type DeclarationStatus = "due" | "overdue" | "in_progress" | "submitted" | "on_file";

export type DeclarationStatementResponse = "unanswered" | "confirmed" | "change_reported";

export interface DeclarationStatement {
  id: string;
  label: string;
  confirmText: string;
  reportChangeLabel?: string;
  allowsReportChange?: boolean;
  response: DeclarationStatementResponse;
}

export interface DriverDeclaration {
  id: string;
  title: string;
  version: string;
  periodLabel: string;
  dueDate: string;
  status: DeclarationStatus;
  summary: string;
  statements: DeclarationStatement[];
  submittedAt?: string;
  submittedBy?: string;
  auditNote?: string;
}

export interface DriverDeclarationsPayload {
  declarations: DriverDeclaration[];
}
