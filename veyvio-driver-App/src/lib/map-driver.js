import { isDispatchAllowedOnboardingStatus } from "./onboarding-blueprint.js";
import { normalizeOnboardingStatus } from "./onboarding-status.js";

export function mapDriverRowToRecord(row, opts = {}) {
  const onboardingStatus = row.onboarding_status;
  const band = row.compliance_band ?? "grey";

  return {
    id: row.id,
    userId: row.user_id,
    organisationId: row.organisation_id,
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    licenceExpiryDate: row.license_expiry?.slice(0, 10) ?? "",
    dqcExpiryDate: row.cpc_expiry?.slice(0, 10) ?? "",
    dbsRequired: Boolean(row.can_do_school_runs),
    dbsExpiryDate: row.dbs_expiry?.slice(0, 10) ?? "",
    medicalExpiryDate: row.medical_expiry?.slice(0, 10) ?? "",
    rightToWorkChecked: Boolean(row.right_to_work_verified),
    onboardingStatus,
    canonicalOnboardingStatus: normalizeOnboardingStatus(onboardingStatus),
    complianceBand: band,
    status: row.status === "suspended" ? "suspended" : isDispatchAllowedOnboardingStatus(onboardingStatus) ? "active" : "pending",
    canDoSchoolRuns: Boolean(row.can_do_school_runs),
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
    (row.license_expiry != null && row.license_expiry.slice(0, 10) < today) ||
    (row.cpc_expiry != null && row.cpc_expiry.slice(0, 10) < today) ||
    (row.medical_expiry != null && row.medical_expiry.slice(0, 10) < today)
  );
}
