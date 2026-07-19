import { getSupabaseClient } from "@/lib/supabase/client";
import { evaluateDriverDispatchReadiness, DRIVER_POLICIES } from "@/lib/onboarding-blueprint";
import {
  normalizeOnboardingStatus,
  normalizeAccountStatus,
  isStepCompleteForProgress,
} from "@/lib/onboarding-status";
import { computeDispatchReadinessBand, canAccessJobs, canAccessVehicleCheck } from "@/lib/dispatch-readiness";
import { getDriverOnboardingRequirements } from "@/services/driver-requirements.service";

export async function loadDriverComplianceReadiness(driver) {
  const supabase = getSupabaseClient();

  const [stepsRes, recordRes, documentsRes, requirements] = await Promise.all([
    supabase
      .from("driver_onboarding_steps")
      .select("step_key, step_label, required, status, review_status")
      .eq("driver_id", driver.id),
    supabase
      .from("driver_onboarding_records")
      .select("dispatch_blocked, rejection_reason, resubmit_requested_items")
      .eq("driver_id", driver.id)
      .maybeSingle(),
    supabase.from("documents").select("id, document_type, status, expires_on").eq("driver_id", driver.id),
    getDriverOnboardingRequirements(driver.id).catch(() => ({
      requiresDbs: Boolean(driver.dbsRequired),
    })),
  ]);

  const steps = stepsRes.data;
  const record = recordRes.data;
  const documents = documentsRes.data;

  const outdatedPolicies = await loadOutdatedPolicyLabels(driver).catch(() => []);

  const missingRequiredSteps = (steps ?? []).filter(
    (s) => s.required && !isStepCompleteForProgress(s.status, s.review_status),
  );

  const dispatchReadiness = evaluateDriverDispatchReadiness({
    onboardingStatus: driver.onboardingStatus,
    employmentStatus: driver.status === "active" ? "active" : driver.status,
    missingStepLabels: missingRequiredSteps.map((s) => s.step_label),
  });

  const blockers = [...dispatchReadiness.blockers];
  if (outdatedPolicies.length > 0) {
    blockers.push(`Please re-accept updated policies: ${outdatedPolicies.join(", ")}`);
  }
  if (requirements.requiresDbs && !driver.dbsExpiryDate) {
    blockers.push("DBS certificate expiry is required for your role");
  }

  const onboardingCanonical = normalizeOnboardingStatus(driver.onboardingStatus);
  const accountStatus = normalizeAccountStatus({
    status: driver.status,
    onboarding_status: driver.onboardingStatus,
  });

  const dispatchBand = computeDispatchReadinessBand({
    onboardingStatus: driver.onboardingStatus,
    accountStatus,
    blockers,
    warnings: dispatchReadiness.warnings ?? [],
    policyReackRequired: outdatedPolicies.length > 0,
  });

  const onboardingApproved =
    onboardingCanonical === "approved" ||
    driver.onboardingStatus === "active" ||
    driver.onboardingStatus === "temporary_access";

  const temporaryAccessScope = driver.temporaryAccessScope ?? null;

  return {
    band: dispatchBand,
    blockers,
    warnings: dispatchReadiness.warnings ?? [],
    missingSteps: missingRequiredSteps.map((s) => s.step_label),
    dispatchBlocked:
      (record?.dispatch_blocked ?? false) === true ||
      (blockers.length > 0 && driver.onboardingStatus !== "active"),
    outdatedPolicies,
    requirements,
    expiringDocuments: (documents ?? []).filter((d) => d.expires_on).slice(0, 5),
    canAccessJobs: canAccessJobs({ dispatchBand, temporaryAccessScope, onboardingApproved }),
    canAccessVehicleCheck: canAccessVehicleCheck({ dispatchBand, temporaryAccessScope, accountStatus }),
    canAccessDuty: blockers.length === 0 && onboardingApproved && dispatchBand !== "blocked",
  };
}

async function loadOutdatedPolicyLabels(driver) {
  const supabase = getSupabaseClient();
  const required = driver.canDoSchoolRuns
    ? DRIVER_POLICIES
    : DRIVER_POLICIES.filter((p) => p.policyKey !== "safeguarding_policy");

  const { data: acceptances, error } = await supabase
    .from("driver_policy_acceptances")
    .select("policy_key, policy_version")
    .eq("driver_id", driver.id);

  if (error) {
    console.warn("[driver-compliance] policy acceptances:", error.message);
    return [];
  }

  const accepted = new Map((acceptances ?? []).map((a) => [a.policy_key, a.policy_version]));
  return required.filter((p) => accepted.get(p.policyKey) !== p.policyVersion).map((p) => p.label);
}

export async function loadDriverBlockers(driver) {
  const readiness = await loadDriverComplianceReadiness(driver);
  return readiness.blockers;
}

export async function loadDriverWarnings(driver) {
  const readiness = await loadDriverComplianceReadiness(driver);
  return readiness.warnings;
}

export function isDbsComplianceGap(readiness) {
  return Boolean(
    readiness?.requirements?.requiresDbs &&
      readiness?.blockers?.some((b) => b.toLowerCase().includes("dbs certificate expiry")),
  );
}

export function getPrimaryComplianceFix(readiness) {
  if (isDbsComplianceGap(readiness)) {
    return {
      kind: "dbs_expiry",
      label: "Add DBS certificate",
      href: "/complete-dbs",
      message: "DBS certificate expiry is required for school transport work.",
    };
  }
  if (readiness?.outdatedPolicies?.length) {
    return {
      kind: "policies",
      label: "Review policies",
      href: "/policies",
      message: readiness.blockers.find((b) => b.includes("policies")) ?? "Updated policies need your acceptance.",
    };
  }
  return null;
}

export function canAccessDriverSection(section, readiness) {
  // Degraded / Command path: compliance tables may be unavailable — still allow core ops screens.
  if (!readiness) {
    return [
      "home",
      "help",
      "policies",
      "profile",
      "settings",
      "working-time",
      "duty",
      "documents",
      "lost-property",
      "schedule",
      "vehicle",
      "check",
      "jobs",
      "job",
      "defects",
      "incidents",
      "messages",
    ].includes(section);
  }
  if (
    section === "home" ||
    section === "help" ||
    section === "policies" ||
    section === "profile" ||
    section === "working-time" ||
    section === "duty" ||
    section === "lost-property" ||
    section === "schedule" ||
    section === "vehicle"
  ) {
    return true;
  }
  if (section === "settings") return true;
  const operational =
    readiness.canAccessJobs || readiness.canAccessVehicleCheck;
  if (
    section === "defects" ||
    section === "incidents" ||
    section === "notifications" ||
    section === "contact" ||
    section === "threads" ||
    section === "thread" ||
    section === "acknowledgements"
  ) {
    return operational;
  }
  if (section === "documents") {
    return true;
  }
  if (section === "messages") return operational;
  if (section === "check") return readiness.canAccessVehicleCheck;
  if (section === "jobs" || section === "job") return readiness.canAccessJobs;
  return false;
}
