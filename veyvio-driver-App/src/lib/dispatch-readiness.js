import { normalizeOnboardingStatus, normalizeAccountStatus } from "@/lib/onboarding-status";

/**
 * Compute dispatch readiness band from driver profile + blockers.
 * @returns {"ready"|"warning"|"blocked"}
 */
export function computeDispatchReadinessBand({
  onboardingStatus,
  accountStatus,
  blockers = [],
  warnings = [],
  policyReackRequired = false,
  temporaryAccessExpired = false,
}) {
  const onboarding = normalizeOnboardingStatus(onboardingStatus);

  if (temporaryAccessExpired) return "blocked";
  if (accountStatus === "suspended" || accountStatus === "offboarded") return "blocked";
  if (onboarding !== "approved" && onboardingStatus !== "active" && onboardingStatus !== "temporary_access") {
    return "blocked";
  }
  if (blockers.length > 0) return "blocked";
  if (warnings.length > 0 || policyReackRequired) return "warning";
  return "ready";
}

export function dispatchReadinessLabel(band) {
  if (band === "ready") return "Ready for dispatch";
  if (band === "warning") return "Dispatch with warnings";
  return "Not dispatch-ready";
}

export function canStartOperationalDuty({ dispatchBand, temporaryAccessScope }) {
  if (dispatchBand === "blocked") return false;
  if (temporaryAccessScope === "training_only" || temporaryAccessScope === "view_only") return false;
  return true;
}

export function canAccessVehicleCheck({ dispatchBand, temporaryAccessScope, accountStatus }) {
  if (accountStatus === "suspended" || accountStatus === "offboarded") return false;
  if (temporaryAccessScope === "view_only") return false;
  if (["checks_only", "training_only", "limited_jobs", "full_dispatch"].includes(temporaryAccessScope)) {
    return true;
  }
  return dispatchBand !== "blocked" || temporaryAccessScope === "checks_only";
}

export function canAccessJobs({ dispatchBand, temporaryAccessScope, onboardingApproved }) {
  if (!onboardingApproved) return false;
  if (temporaryAccessScope === "training_only" || temporaryAccessScope === "checks_only" || temporaryAccessScope === "view_only") {
    return temporaryAccessScope === "view_only" || temporaryAccessScope === "limited_jobs";
  }
  return dispatchBand === "ready" || dispatchBand === "warning" || temporaryAccessScope === "full_dispatch" || temporaryAccessScope === "limited_jobs";
}

export function deriveAccountStatusFromRow(driverRow) {
  return normalizeAccountStatus(driverRow);
}
