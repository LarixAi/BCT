import type { IncidentCategoryCode } from "./categories";
import type { TriStateAnswer } from "./types";

export type FormFieldType =
  | "tristate"
  | "text"
  | "textarea"
  | "passenger_select"
  | "evidence"
  | "datetime";

export interface IncidentFormField {
  key: string;
  label: string;
  type: FormFieldType;
  section: "immediate" | "identification" | "people" | "what_happened" | "actions" | "vehicle" | "evidence" | "declaration";
  helpText?: string;
  requiredStage?: "initial" | "complete" | "later";
  allowUnknown?: boolean;
}

export interface ConditionalRequirement {
  whenField: string;
  equals: unknown;
  requireFields: string[];
  stage: "initial" | "complete" | "later";
}

export interface IncidentFormDefinition {
  categoryCode: IncidentCategoryCode;
  version: number;
  immediateFields: IncidentFormField[];
  followUpFields: IncidentFormField[];
  requiredFields: ConditionalRequirement[];
}

const TRISTATE_FIELD = (
  key: string,
  label: string,
  section: IncidentFormField["section"],
  requiredStage?: IncidentFormField["requiredStage"],
): IncidentFormField => ({
  key,
  label,
  type: "tristate",
  section,
  allowUnknown: true,
  requiredStage,
});

const IMMEDIATE_SAFETY_FIELDS: IncidentFormField[] = [
  TRISTATE_FIELD("immediateDanger", "Is anyone in immediate danger?", "immediate", "initial"),
  TRISTATE_FIELD("emergencyAssistanceRequired", "Does anyone need emergency assistance?", "immediate", "initial"),
  TRISTATE_FIELD("injuryReported", "Is anyone injured or missing?", "immediate", "initial"),
  TRISTATE_FIELD("fireOrSmoke", "Is there fire or smoke?", "immediate", "initial"),
  TRISTATE_FIELD("vehicleSafePosition", "Is the vehicle in a safe position?", "immediate", "initial"),
  TRISTATE_FIELD("passengersOnboard", "Are passengers onboard?", "immediate", "initial"),
  TRISTATE_FIELD("journeyCanContinue", "Can the journey continue safely?", "immediate", "initial"),
];

const BASE_FOLLOW_UP: IncidentFormField[] = [
  { key: "description", label: "What happened?", type: "textarea", section: "what_happened", requiredStage: "complete" },
  { key: "injuryDescription", label: "Injury details", type: "textarea", section: "people", requiredStage: "complete" },
  { key: "reasonCannotContinue", label: "Why can the journey not continue?", type: "textarea", section: "what_happened", requiredStage: "complete" },
  { key: "driverStatement", label: "Driver statement", type: "textarea", section: "declaration", requiredStage: "complete" },
  { key: "witnesses", label: "Witness details", type: "textarea", section: "people", requiredStage: "later" },
  { key: "policeReference", label: "Police reference", type: "text", section: "actions", requiredStage: "later" },
  { key: "evidencePhotos", label: "Photographs", type: "evidence", section: "evidence", requiredStage: "later" },
];

const CATEGORY_EXTENSIONS: Partial<Record<IncidentCategoryCode, IncidentFormField[]>> = {
  road_collision: [
    TRISTATE_FIELD("anotherVehicleInvolved", "Has another vehicle or person been involved?", "what_happened", "complete"),
    TRISTATE_FIELD("policeAttended", "Did police attend?", "actions", "later"),
    { key: "otherVehicleRegistration", label: "Other vehicle registration", type: "text", section: "what_happened", requiredStage: "later" },
    TRISTATE_FIELD("dashcamAvailable", "Is dashcam footage available?", "evidence", "later"),
  ],
  passenger_injury: [
    { key: "passengerId", label: "Which passenger is involved?", type: "passenger_select", section: "people", requiredStage: "initial" },
    TRISTATE_FIELD("passengerConscious", "Is the passenger conscious?", "people", "initial"),
    TRISTATE_FIELD("passengerBreathingNormally", "Is the passenger breathing normally?", "people", "initial"),
    TRISTATE_FIELD("firstAidProvided", "Was first aid provided?", "actions", "complete"),
    TRISTATE_FIELD("parentCarerInformed", "Has a parent or carer been informed?", "actions", "complete"),
    TRISTATE_FIELD("hospitalAttendance", "Was the passenger taken to hospital?", "actions", "later"),
  ],
  passenger_missing: [
    { key: "passengerId", label: "Which passenger cannot be located?", type: "passenger_select", section: "people", requiredStage: "initial" },
    { key: "lastSeenAt", label: "When were they last seen?", type: "datetime", section: "what_happened", requiredStage: "initial" },
    { key: "lastSeenLocation", label: "Where were they last seen?", type: "text", section: "what_happened", requiredStage: "initial" },
    TRISTATE_FIELD("vehicleSearched", "Has the vehicle been physically searched?", "actions", "initial"),
    TRISTATE_FIELD("controlContacted", "Has control been contacted?", "actions", "initial"),
    TRISTATE_FIELD("vulnerablePassenger", "Is the passenger a child or vulnerable adult?", "people", "initial"),
  ],
  passenger_left_on_vehicle: [
    { key: "passengerId", label: "Which passenger was left onboard?", type: "passenger_select", section: "people", requiredStage: "initial" },
    TRISTATE_FIELD("controlContacted", "Has control been contacted?", "actions", "initial"),
  ],
  vehicle_breakdown: [
    TRISTATE_FIELD("vehicleDriveable", "Can the vehicle be driven?", "vehicle", "initial"),
    { key: "breakdownDescription", label: "What failed?", type: "textarea", section: "vehicle", requiredStage: "complete" },
  ],
  wheelchair_restraint_failure: [
    TRISTATE_FIELD("passengerInvolved", "Was a passenger using the equipment?", "people", "initial"),
    TRISTATE_FIELD("injuryReported", "Was anyone injured?", "people", "initial"),
    { key: "equipmentDescription", label: "Which equipment failed?", type: "text", section: "vehicle", requiredStage: "complete" },
  ],
};

const CATEGORY_CONDITIONALS: Partial<Record<IncidentCategoryCode, ConditionalRequirement[]>> = {
  road_collision: [
    { whenField: "injuryReported", equals: "yes", requireFields: ["injuryDescription"], stage: "complete" },
    { whenField: "policeAttended", equals: "yes", requireFields: ["policeReference"], stage: "later" },
    { whenField: "anotherVehicleInvolved", equals: "yes", requireFields: ["otherVehicleRegistration"], stage: "later" },
    { whenField: "journeyCanContinue", equals: "no", requireFields: ["reasonCannotContinue"], stage: "complete" },
  ],
  passenger_injury: [
    { whenField: "passengerInvolved", equals: true, requireFields: ["passengerId"], stage: "initial" },
    { whenField: "emergencyAssistanceRequired", equals: "yes", requireFields: ["emergencyServiceType"], stage: "complete" },
  ],
  passenger_missing: [
    { whenField: "passengerId", equals: null, requireFields: ["unidentifiedPassengerReason"], stage: "initial" },
  ],
};

export function getIncidentFormDefinition(categoryCode: IncidentCategoryCode): IncidentFormDefinition {
  return {
    categoryCode,
    version: 1,
    immediateFields: [...IMMEDIATE_SAFETY_FIELDS],
    followUpFields: [...BASE_FOLLOW_UP, ...(CATEGORY_EXTENSIONS[categoryCode] ?? [])],
    requiredFields: CATEGORY_CONDITIONALS[categoryCode] ?? [
      { whenField: "journeyCanContinue", equals: "no", requireFields: ["reasonCannotContinue"], stage: "complete" },
      { whenField: "injuryReported", equals: "yes", requireFields: ["injuryDescription"], stage: "complete" },
    ],
  };
}

export function getInitialFormFields(categoryCode: IncidentCategoryCode): IncidentFormField[] {
  const def = getIncidentFormDefinition(categoryCode);
  return [
    ...def.immediateFields,
    ...(CATEGORY_EXTENSIONS[categoryCode]?.filter((f) => f.requiredStage === "initial") ?? []),
  ];
}

export function getCompletionFormFields(categoryCode: IncidentCategoryCode): IncidentFormField[] {
  const def = getIncidentFormDefinition(categoryCode);
  return def.followUpFields.filter(
    (field) => field.requiredStage === "complete" || field.requiredStage === "later",
  );
}

export function groupFormFieldsBySection(
  fields: IncidentFormField[],
): Record<IncidentFormField["section"], IncidentFormField[]> {
  const groups = {} as Record<IncidentFormField["section"], IncidentFormField[]>;
  for (const field of fields) {
    if (!groups[field.section]) groups[field.section] = [];
    groups[field.section].push(field);
  }
  return groups;
}

export const FORM_SECTION_LABELS: Record<IncidentFormField["section"], string> = {
  immediate: "Immediate safety",
  identification: "Incident identification",
  people: "People involved",
  what_happened: "What happened",
  actions: "Immediate actions",
  vehicle: "Vehicle and equipment",
  evidence: "Evidence",
  declaration: "Declaration",
};

export function triStateOptions(): { value: TriStateAnswer; label: string }[] {
  return [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "not_yet_confirmed", label: "Not yet confirmed" },
    { value: "unknown", label: "Unknown" },
    { value: "not_applicable", label: "Not applicable" },
  ];
}
