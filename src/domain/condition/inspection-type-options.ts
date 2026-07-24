import type { InspectionType } from "@/types/condition";
import { INSPECTION_TYPE_LABELS } from "@/types/condition";
import type { VehicleConditionProfile } from "@/types/condition";

/** Where the inspection wizard was opened from — controls dropdown options. */
export type InspectionWizardContext =
  | "vehicle-condition"
  | "repair-verification"
  | "inspections-hub";

export interface InspectionTypeOption {
  value: InspectionType;
  label: string;
}

export interface InspectionTypeOptionGroup {
  label: string;
  options: InspectionTypeOption[];
}

/** Body & paint inspections only — used on Vehicle → Condition tab. */
export const VEHICLE_CONDITION_INSPECTION_GROUPS: InspectionTypeOptionGroup[] = [
  {
    label: "Baseline",
    options: [
      { value: "onboarding-baseline", label: INSPECTION_TYPE_LABELS["onboarding-baseline"] },
    ],
  },
  {
    label: "Routine bodywork",
    options: [
      { value: "yard-check", label: INSPECTION_TYPE_LABELS["yard-check"] },
      { value: "weekly-bodywork", label: INSPECTION_TYPE_LABELS["weekly-bodywork"] },
      { value: "routine-inspection", label: INSPECTION_TYPE_LABELS["routine-inspection"] },
      { value: "manager-audit", label: INSPECTION_TYPE_LABELS["manager-audit"] },
    ],
  },
  {
    label: "Handover & movement",
    options: [
      { value: "start-shift-handover", label: INSPECTION_TYPE_LABELS["start-shift-handover"] },
      { value: "end-shift-return", label: INSPECTION_TYPE_LABELS["end-shift-return"] },
      { value: "depot-transfer", label: INSPECTION_TYPE_LABELS["depot-transfer"] },
    ],
  },
  {
    label: "Damage & incidents",
    options: [
      { value: "reported-damage", label: INSPECTION_TYPE_LABELS["reported-damage"] },
      { value: "after-incident", label: INSPECTION_TYPE_LABELS["after-incident"] },
      { value: "post-repair", label: INSPECTION_TYPE_LABELS["post-repair"] },
    ],
  },
  {
    label: "Leaving the fleet",
    options: [
      { value: "lease-return", label: INSPECTION_TYPE_LABELS["lease-return"] },
      { value: "disposal", label: INSPECTION_TYPE_LABELS.disposal },
      { value: "other", label: INSPECTION_TYPE_LABELS.other },
    ],
  },
];

export const REPAIR_VERIFICATION_INSPECTION_TYPES: InspectionTypeOption[] = [
  { value: "post-repair", label: INSPECTION_TYPE_LABELS["post-repair"] },
];

/** Flat list of types valid on the vehicle condition tab. */
export const VEHICLE_CONDITION_INSPECTION_TYPES: InspectionType[] =
  VEHICLE_CONDITION_INSPECTION_GROUPS.flatMap(g => g.options.map(o => o.value));

export function getInspectionTypeGroups(
  context: InspectionWizardContext,
): InspectionTypeOptionGroup[] {
  switch (context) {
    case "repair-verification":
      return [{ label: "Post-repair", options: REPAIR_VERIFICATION_INSPECTION_TYPES }];
    case "inspections-hub":
    case "vehicle-condition":
    default:
      return VEHICLE_CONDITION_INSPECTION_GROUPS;
  }
}

export function getInspectionTypeOptions(context: InspectionWizardContext): InspectionTypeOption[] {
  return getInspectionTypeGroups(context).flatMap(g => g.options);
}

export function resolveInspectionWizardContext(opts: {
  repairOrderId?: string;
  fromInspectionsHub?: boolean;
}): InspectionWizardContext {
  if (opts.repairOrderId) return "repair-verification";
  if (opts.fromInspectionsHub) return "inspections-hub";
  return "vehicle-condition";
}

/** Pick a default type that exists in the current context menu. */
export function defaultInspectionTypeForContext(
  context: InspectionWizardContext,
  profile: VehicleConditionProfile,
  initialType?: InspectionType,
): InspectionType {
  const allowed = new Set(getInspectionTypeOptions(context).map(o => o.value));
  if (initialType && allowed.has(initialType)) return initialType;
  if (context === "repair-verification") return "post-repair";
  if (profile.baselineStatus !== "approved" && allowed.has("onboarding-baseline")) {
    return "onboarding-baseline";
  }
  if (allowed.has("yard-check")) return "yard-check";
  return getInspectionTypeOptions(context)[0]?.value ?? "yard-check";
}

export function isInspectionTypeAllowed(
  type: InspectionType,
  context: InspectionWizardContext,
): boolean {
  return getInspectionTypeOptions(context).some(o => o.value === type);
}
