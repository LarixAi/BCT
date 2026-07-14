import type { IncidentCategoryCode } from "./categories";
import type { DriverIncidentSubmission, IncidentFieldValue } from "./types";
import { getIncidentFormDefinition } from "./form-definitions";

export interface CompletenessBreakdown {
  immediateSafety: number;
  operational: number;
  people: number;
  evidence: number;
  driverStatement: number;
  externalParties: number;
  overall: number;
  missingFields: string[];
}

function hasAnswer(answers: Record<string, IncidentFieldValue<unknown>>, key: string): boolean {
  const entry = answers[key];
  return entry != null && entry.value !== "" && entry.value != null;
}

function sectionScore(keys: string[], answers: Record<string, IncidentFieldValue<unknown>>): number {
  if (keys.length === 0) return 100;
  const answered = keys.filter((key) => hasAnswer(answers, key)).length;
  return Math.round((answered / keys.length) * 100);
}

export function calculateCompleteness(submission: DriverIncidentSubmission): CompletenessBreakdown {
  const def = getIncidentFormDefinition(submission.categoryCode);
  const answers = {
    ...submission.answers,
    immediateDanger: submission.immediateDanger,
  };

  const immediateKeys = def.immediateFields.map((f) => f.key);
  const peopleKeys = def.followUpFields.filter((f) => f.section === "people").map((f) => f.key);
  const evidenceKeys = def.followUpFields.filter((f) => f.section === "evidence").map((f) => f.key);
  const externalKeys = ["policeAttended", "otherVehicleRegistration", "policeReference", "insurerDetails"];
  const statementKeys = ["driverStatement", "description"];

  const immediateSafety = sectionScore(immediateKeys, answers);
  const operational = sectionScore(
    ["journeyCanContinue", "vehicleSafePosition", "passengersOnboard"],
    answers,
  );
  const people = sectionScore(peopleKeys, answers);
  const evidence = submission.evidence.length > 0 ? 100 : sectionScore(evidenceKeys, answers);
  const driverStatement = sectionScore(statementKeys, answers);
  const externalParties = sectionScore(externalKeys, answers);

  const weights = weightsForCategory(submission.categoryCode);
  const overall = Math.round(
    immediateSafety * weights.immediate +
      operational * weights.operational +
      people * weights.people +
      evidence * weights.evidence +
      driverStatement * weights.statement +
      externalParties * weights.external,
  );

  const missingFields = [
    ...def.immediateFields,
    ...def.followUpFields,
  ]
    .filter((field) => field.requiredStage === "complete" && !hasAnswer(answers, field.key))
    .map((field) => field.label);

  return {
    immediateSafety,
    operational,
    people,
    evidence,
    driverStatement,
    externalParties,
    overall,
    missingFields,
  };
}

function weightsForCategory(categoryCode: IncidentCategoryCode) {
  if (categoryCode === "road_collision") {
    return { immediate: 0.25, operational: 0.2, people: 0.15, evidence: 0.15, statement: 0.15, external: 0.1 };
  }
  if (categoryCode === "passenger_injury" || categoryCode === "passenger_missing") {
    return { immediate: 0.3, operational: 0.1, people: 0.25, evidence: 0.1, statement: 0.15, external: 0.1 };
  }
  return { immediate: 0.3, operational: 0.2, people: 0.15, evidence: 0.1, statement: 0.15, external: 0.1 };
}

export function driverReportStageLabel(stage: DriverIncidentSubmission["stage"]): string {
  switch (stage) {
    case "draft":
      return "Draft";
    case "initial_submitted":
      return "Initial safety report received";
    case "completing":
      return "Full driver report incomplete";
    case "complete":
      return "Driver report complete";
  }
}
