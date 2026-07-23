import { isDispatchAllowedOnboardingStatus } from "./onboarding-blueprint.js";
import { normalizeOnboardingStatus } from "./onboarding-status.js";

function dateField(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value) return String(value).slice(0, 10);
  }
  return "";
}

export function mapDriverRowToRecord(row, opts = {}) {
  const onboardingStatus = row.onboarding_status;
  const band = row.compliance_band ?? "grey";
  const workKeys = Array.isArray(row.work_permission_keys) ? row.work_permission_keys : [];

  return {
    id: row.id,
    userId: row.user_id,
    organisationId: row.organisation_id,
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    licenceExpiryDate: dateField(row, "licence_expiry_date", "license_expiry", "licence_expiry"),
    dqcExpiryDate: dateField(row, "cpc_expiry_date", "cpc_expiry", "dqc_expiry"),
    dbsRequired: Boolean(row.can_do_school_runs) || workKeys.includes("school"),
    dbsExpiryDate: dateField(row, "dbs_expiry_date", "dbs_expiry"),
    medicalExpiryDate: dateField(row, "medical_expiry_date", "medical_expiry"),
    rightToWorkChecked: Boolean(row.right_to_work_verified),
    onboardingStatus,
    canonicalOnboardingStatus: normalizeOnboardingStatus(onboardingStatus),
    complianceBand: band,
    status: row.status === "suspended" ? "suspended" : isDispatchAllowedOnboardingStatus(onboardingStatus) ? "active" : "pending",
    canDoSchoolRuns: Boolean(row.can_do_school_runs) || workKeys.includes("school"),
    canDoPrivateHire: Boolean(row.can_do_private_hire),
    canDoCoachWork: Boolean(row.can_do_coach_work),
    employmentType: row.employment_type ?? null,
    driverRole: row.driver_role ?? null,
    licenceNumber: row.license_no ?? "",
    homeDepotId: row.home_depot_id,
    homeDepotName: opts.depotName ?? null,
    rejectionReason: row.rejection_reason ?? null,
    temporaryAccessScope: row.temporary_access_scope ?? (row.onboarding_status === "temporary_access" ? "limited_jobs" : null),
    temporaryAccessExpiresAt: row.temporary_access_expires_at ?? null,
    temporaryAccessReason: row.temporary_access_reason ?? null,
  };
}

export function isDriverRestricted(row) {
  if (row.status === "suspended" || row.status === "inactive") return true;
  if (normalizeOnboardingStatus(row.onboarding_status) === "rejected") return true;
  const today = new Date().toISOString().slice(0, 10);
  return (
    (dateField(row, "licence_expiry_date", "license_expiry", "licence_expiry") && dateField(row, "licence_expiry_date", "license_expiry", "licence_expiry") < today) ||
    (dateField(row, "cpc_expiry_date", "cpc_expiry", "dqc_expiry") && dateField(row, "cpc_expiry_date", "cpc_expiry", "dqc_expiry") < today) ||
    (dateField(row, "medical_expiry_date", "medical_expiry") && dateField(row, "medical_expiry_date", "medical_expiry") < today)
  );
}
