/** Canonical onboarding / account / document / step status vocabulary for the driver app. */

export const ONBOARDING_STATUSES = [
  "invited",
  "in_progress",
  "submitted",
  "action_required",
  "approved",
  "rejected",
];

export const ACCOUNT_STATUSES = ["active", "temporary_access", "suspended", "offboarded"];

export const DISPATCH_READINESS = ["ready", "warning", "blocked"];

export const STEP_UI_STATUSES = [
  "locked",
  "not_started",
  "in_progress",
  "ready",
  "completed",
  "pending_review",
  "action_required",
  "approved",
  "not_required",
];

/** Map legacy Supabase `drivers.onboarding_status` values to canonical onboarding status. */
const LEGACY_TO_CANONICAL_ONBOARDING = {
  draft: "invited",
  invited: "invited",
  profile_submitted: "in_progress",
  documents_pending: "in_progress",
  documents_submitted: "in_progress",
  compliance_review: "submitted",
  approved: "approved",
  active: "approved",
  temporary_access: "approved",
  rejected: "rejected",
  suspended: "rejected",
  expired_documents: "action_required",
  left_company: "rejected",
};

/** Write back to Supabase — keeps admin hub compatibility. */
const CANONICAL_TO_LEGACY_ONBOARDING = {
  invited: "invited",
  in_progress: "documents_pending",
  submitted: "compliance_review",
  action_required: "documents_pending",
  approved: "approved",
  rejected: "rejected",
};

/** DB step.status → canonical step completion. */
const DB_STEP_TO_CANONICAL = {
  pending: "not_started",
  submitted: "completed_by_driver",
  verified: "approved",
  rejected: "action_required",
  expired: "action_required",
  expiring_soon: "completed_by_driver",
  not_required: "not_required",
};

const DRIVER_COMPLETE_STEP_DB = new Set(["submitted", "verified", "expiring_soon"]);
const DRIVER_COMPLETE_STEP_CANONICAL = new Set(["completed_by_driver", "approved"]);

/** DB documents.status → canonical document review status. */
const DB_DOC_TO_CANONICAL = {
  pending: "pending_review",
  draft: "draft",
  approved: "approved",
  rejected: "rejected",
  valid: "approved",
  expiring_soon: "approved",
  expired: "expired",
};

export function normalizeOnboardingStatus(raw) {
  if (!raw) return "invited";
  if (ONBOARDING_STATUSES.includes(raw)) return raw;
  return LEGACY_TO_CANONICAL_ONBOARDING[raw] ?? "in_progress";
}

export function toLegacyOnboardingStatus(canonical) {
  return CANONICAL_TO_LEGACY_ONBOARDING[canonical] ?? canonical;
}

export function normalizeAccountStatus(driverRow) {
  const employment = driverRow?.status ?? "active";
  const onboarding = normalizeOnboardingStatus(driverRow?.onboarding_status);

  if (employment === "suspended" || employment === "inactive") return "suspended";
  if (employment === "left_company" || onboarding === "rejected") return "offboarded";
  if (driverRow?.onboarding_status === "temporary_access") return "temporary_access";
  if (["active", "approved"].includes(onboarding) || driverRow?.onboarding_status === "active") {
    return "active";
  }
  return employment === "pending" ? "active" : "active";
}

export function normalizeStepStatus(dbStatus, reviewStatus) {
  if (reviewStatus === "approved" || dbStatus === "verified") return "approved";
  if (reviewStatus === "rejected" || dbStatus === "rejected") return "action_required";
  if (reviewStatus === "pending" && DRIVER_COMPLETE_STEP_DB.has(dbStatus)) return "pending_review";
  return DB_STEP_TO_CANONICAL[dbStatus] ?? "not_started";
}

export function isStepCompletedByDriver(dbStatus) {
  return DRIVER_COMPLETE_STEP_DB.has(dbStatus);
}

export function isStepCompleteForProgress(dbStatus, reviewStatus) {
  const canonical = normalizeStepStatus(dbStatus, reviewStatus);
  return DRIVER_COMPLETE_STEP_CANONICAL.has(canonical) || canonical === "pending_review" || canonical === "approved";
}

export function normalizeDocumentStatus(dbStatus) {
  return DB_DOC_TO_CANONICAL[dbStatus] ?? "pending_review";
}

export function isOnboardingEditableStatus(rawStatus, { rejectionReason, resubmitItems = [] } = {}) {
  const canonical = normalizeOnboardingStatus(rawStatus);
  if (canonical === "submitted" || canonical === "approved") return false;
  if (canonical === "rejected") return false;
  if (canonical === "action_required") return true;
  if (canonical === "invited" || canonical === "in_progress") return true;
  if (rawStatus === "documents_pending" && (rejectionReason || resubmitItems.length > 0)) return true;
  return ["invited", "draft", "profile_submitted", "documents_pending", "documents_submitted", "action_required"].includes(
    rawStatus,
  );
}

export function onboardingStatusLabel(canonical) {
  const labels = {
    invited: "Not started",
    in_progress: "In progress",
    submitted: "Submitted for review",
    action_required: "Action required",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[canonical] ?? canonical.replace(/_/g, " ");
}

export function stepUiStatusLabel(status) {
  const labels = {
    locked: "Locked",
    not_started: "Not started",
    in_progress: "In progress",
    ready: "Ready",
    current: "Continue",
    completed: "Completed",
    pending_review: "Pending review",
    action_required: "Needs update",
    approved: "Approved",
    not_required: "Not required",
    rejected: "Needs update",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
