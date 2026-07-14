import type { IncidentCategoryCode } from "./categories";
import type { DriverIncidentSubmission, IncidentFieldValue, TriStateAnswer } from "./types";
import { getIncidentFormDefinition } from "./form-definitions";

export type ValidationStage = "initial" | "complete";

export interface ValidationIssue {
  fieldKey: string;
  message: string;
  stage: ValidationStage | "later";
}

function fieldValue<T>(answers: Record<string, IncidentFieldValue<unknown>>, key: string): T | undefined {
  return answers[key]?.value as T | undefined;
}

export function validateDriverSubmission(
  submission: Pick<DriverIncidentSubmission, "categoryCode" | "answers" | "immediateDanger" | "summary" | "operationalImpact">,
  stage: ValidationStage,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const def = getIncidentFormDefinition(submission.categoryCode);
  const answers = {
    ...submission.answers,
    immediateDanger: submission.immediateDanger,
    injuryReported: submission.answers.injuryReported,
    journeyCanContinue: submission.answers.journeyCanContinue ?? submission.operationalImpact?.journeyCanContinue,
    emergencyAssistanceRequired: submission.answers.emergencyAssistanceRequired,
  };

  if (stage === "initial") {
    if (!submission.immediateDanger?.value) {
      issues.push({ fieldKey: "immediateDanger", message: "Confirm whether anyone is in immediate danger.", stage: "initial" });
    }
    if (!submission.summary.trim()) {
      issues.push({ fieldKey: "summary", message: "Add a short description of what happened.", stage: "initial" });
    }
    for (const field of def.immediateFields) {
      if (field.requiredStage === "initial" && !fieldValue(answers, field.key)) {
        issues.push({ fieldKey: field.key, message: `${field.label} is required for the emergency report.`, stage: "initial" });
      }
    }
  }

  if (stage === "complete") {
    for (const field of def.followUpFields) {
      if (field.requiredStage === "complete" && field.type !== "evidence" && !fieldValue(answers, field.key)) {
        issues.push({
          fieldKey: field.key,
          message: `${field.label} is required before submitting the full report.`,
          stage: "complete",
        });
      }
    }
    if (!fieldValue(answers, "description") && !submission.summary.trim()) {
      issues.push({ fieldKey: "description", message: "Add what happened before submitting.", stage: "complete" });
    }
  }

  for (const rule of def.requiredFields) {
    if (rule.stage !== stage && rule.stage !== "later") continue;
    const current = fieldValue(answers, rule.whenField);
    if (current === rule.equals && rule.stage === stage) {
      for (const requiredField of rule.requireFields) {
        if (!fieldValue(answers, requiredField)) {
          issues.push({
            fieldKey: requiredField,
            message: `Required because ${rule.whenField} is ${String(rule.equals)}.`,
            stage: rule.stage,
          });
        }
      }
    }
  }

  return issues;
}

export function inferSeverity(
  categoryCode: IncidentCategoryCode,
  answers: Record<string, IncidentFieldValue<unknown>>,
  immediateDanger: IncidentFieldValue<string>,
): import("./types").IncidentSeverity {
  if (categoryCode === "passenger_missing" || categoryCode === "passenger_left_on_vehicle") return "critical";
  if (immediateDanger.value === "yes" || immediateDanger.value === "emergency_contacted") return "critical";
  if (fieldValue<TriStateAnswer>(answers, "injuryReported") === "yes") return "high";
  if (categoryCode === "safeguarding") return "high";
  if (categoryCode === "near_miss") return "near_miss";
  if (categoryCode === "vehicle_breakdown") return "medium";
  return "medium";
}

export function buildIncidentSummary(
  categoryCode: IncidentCategoryCode,
  answers: Record<string, IncidentFieldValue<unknown>>,
  freeText?: string,
): string {
  const injury = fieldValue<TriStateAnswer>(answers, "injuryReported");
  const danger = fieldValue<string>(answers, "immediateDanger");
  const parts = [categoryCode.replace(/_/g, " ")];
  if (injury === "yes") parts.push("injuries reported");
  else if (injury === "not_yet_confirmed") parts.push("injury status not yet confirmed");
  if (danger === "yes") parts.push("immediate danger");
  if (freeText?.trim()) parts.push(freeText.trim().slice(0, 80));
  return parts.join(" — ");
}
