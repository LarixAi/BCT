/** Ported from @core-support/fleet-shared for Capacitor driver app (JS). */

export const DISPATCH_ALLOWED_ONBOARDING_STATUSES = ["active", "temporary_access"];

export function isDispatchAllowedOnboardingStatus(status) {
  return DISPATCH_ALLOWED_ONBOARDING_STATUSES.includes(status);
}

export const DEFAULT_ONBOARDING_STEP_TEMPLATES = [
  { stepKey: "personal_profile", stepLabel: "Personal details", required: true },
  { stepKey: "emergency_contact", stepLabel: "Emergency contact", required: true },
  { stepKey: "right_to_work", stepLabel: "Right to work", required: true },
  { stepKey: "driving_licence", stepLabel: "Driving licence", required: true },
  { stepKey: "dvla_check", stepLabel: "DVLA licence check", required: true },
  { stepKey: "dqc_cpc", stepLabel: "Driver CPC / DQC", required: true },
  { stepKey: "dbs_safeguarding", stepLabel: "DBS / Safeguarding", required: false },
  { stepKey: "medical_declaration", stepLabel: "Medical declaration", required: true },
  { stepKey: "policies", stepLabel: "Policies & handbook", required: true },
  { stepKey: "vehicle_check_training", stepLabel: "Vehicle check training", required: true },
  { stepKey: "review_submit", stepLabel: "Review & submit", required: true },
];

export const MOBILE_ONBOARDING_SCREENS = [
  { stepKey: "accept_invite", title: "Accept invite", sortOrder: 1 },
  { stepKey: "account_security", title: "Account security", sortOrder: 2 },
  { stepKey: "personal_profile", title: "Personal details", sortOrder: 3 },
  { stepKey: "emergency_contact", title: "Emergency contact", sortOrder: 4 },
  { stepKey: "right_to_work", title: "Right to work", sortOrder: 5 },
  { stepKey: "driving_licence", title: "Driving licence", sortOrder: 6 },
  { stepKey: "dqc_cpc", title: "Driver CPC / DQC", sortOrder: 7 },
  { stepKey: "dbs_safeguarding", title: "DBS / Safeguarding", sortOrder: 8, conditional: true },
  { stepKey: "medical_declaration", title: "Medical declaration", sortOrder: 9 },
  { stepKey: "policies", title: "Policies & handbook", sortOrder: 10 },
  { stepKey: "vehicle_check_training", title: "Vehicle check training", sortOrder: 11 },
  { stepKey: "review_submit", title: "Review & submit", sortOrder: 12 },
];

export const DRIVER_POLICIES = [
  { policyKey: "driver_handbook", policyVersion: "2026-01", label: "Driver handbook" },
  { policyKey: "safeguarding_policy", policyVersion: "2026-01", label: "Safeguarding policy" },
  { policyKey: "vehicle_check_policy", policyVersion: "2026-01", label: "Vehicle check policy" },
  { policyKey: "defect_policy", policyVersion: "2026-01", label: "Defect reporting policy" },
  { policyKey: "incident_policy", policyVersion: "2026-01", label: "Incident reporting policy" },
  { policyKey: "passenger_safety_policy", policyVersion: "2026-01", label: "Passenger safety policy" },
  { policyKey: "mobile_phone_policy", policyVersion: "2026-01", label: "Mobile phone policy" },
  { policyKey: "fatigue_policy", policyVersion: "2026-01", label: "Fatigue / fitness to drive policy" },
  { policyKey: "data_protection_policy", policyVersion: "2026-01", label: "Data protection policy" },
  { policyKey: "tachograph_policy", policyVersion: "2026-01", label: "Tachograph / drivers' hours policy" },
];

export function groupOnboardingStatus(status) {
  if (["draft", "invited"].includes(status)) return "draft";
  if (["profile_submitted", "documents_pending", "documents_submitted"].includes(status)) return "submitted";
  if (["compliance_review", "approved"].includes(status)) return "under_review";
  if (["active", "temporary_access"].includes(status)) return "approved";
  if (status === "rejected") return "rejected";
  if (["suspended", "left_company"].includes(status)) return "suspended";
  if (status === "expired_documents") return "expired_documents";
  return "draft";
}

export function evaluateDriverDispatchReadiness(input) {
  const blockers = [];
  if (!isDispatchAllowedOnboardingStatus(input.onboardingStatus)) {
    blockers.push(`Onboarding not approved (${input.onboardingStatus.replace(/_/g, " ")})`);
  }
  if (input.employmentStatus && input.employmentStatus !== "active") {
    blockers.push(`Employment status is ${input.employmentStatus}`);
  }
  for (const label of input.missingStepLabels ?? []) {
    blockers.push(`Missing: ${label}`);
  }
  return { isDispatchReady: blockers.length === 0, blockers, warnings: [] };
}
