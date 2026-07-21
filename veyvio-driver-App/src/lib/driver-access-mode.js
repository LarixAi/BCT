import {
  normalizeOnboardingStatus,
  normalizeAccountStatus,
  isOnboardingEditableStatus,
} from "@/lib/onboarding-status";
import { computeDispatchReadinessBand } from "@/lib/dispatch-readiness";

/**
 * App modes returned to DriverApp / DriverSupabaseAuthContext.
 * @returns {"login"|"unlinked"|"onboarding"|"pending"|"restricted"|"app"|"policy_reack"}
 */
export function resolveDriverAccessMode(input) {
  const {
    signedIn = false,
    isDriverMember = true,
    driverProfileLinked = true,
    driverRow = null,
    driver = null,
    rejectionReason = null,
    resubmitItems = [],
    policyReackRequired = false,
    dispatchBlockers = [],
    dispatchWarnings = [],
    temporaryAccess = null,
    operationalStatus = null,
  } = input;

  if (!signedIn) return "login";
  // Signed in but Command says this account is not a driver — do not recycle the
  // password screen (that looks like "stuck on auth" after a successful Auth call).
  if (!isDriverMember) return "unlinked";
  if (!driverProfileLinked || !driver) return "onboarding";

  // Admin activated for dispatch — open the ops shell.
  if (["eligible", "restricted"].includes(String(operationalStatus ?? ""))) {
    if (policyReackRequired) return "policy_reack";
    return "app";
  }

  const onboardingRaw = driverRow?.onboarding_status ?? driver.onboardingStatus ?? "invited";
  const onboardingStatus = normalizeOnboardingStatus(onboardingRaw);
  const accountStatus = normalizeAccountStatus(driverRow ?? { status: driver.status, onboarding_status: onboardingRaw });

  const tempExpired =
    temporaryAccess?.enabled &&
    temporaryAccess?.expiresAt &&
    new Date(temporaryAccess.expiresAt).getTime() < Date.now();

  if (accountStatus === "suspended" || accountStatus === "offboarded") {
    return "restricted";
  }
  if (onboardingStatus === "rejected") {
    return "restricted";
  }
  if (tempExpired && accountStatus === "temporary_access") {
    return "restricted";
  }

  if (onboardingStatus === "invited" || onboardingStatus === "in_progress" || onboardingStatus === "action_required") {
    return "onboarding";
  }

  if (onboardingStatus === "submitted") {
    return "pending";
  }

  const onboardingApproved =
    onboardingStatus === "approved" ||
    onboardingRaw === "active" ||
    onboardingRaw === "temporary_access";

  if (onboardingApproved && onboardingRaw === "approved" && accountStatus !== "active" && accountStatus !== "temporary_access") {
    return "pending";
  }

  if (
    onboardingApproved &&
    (accountStatus === "active" || accountStatus === "temporary_access")
  ) {
    if (policyReackRequired) return "policy_reack";
    return "app";
  }

  if (onboardingRaw === "approved" && accountStatus === "active") {
    if (policyReackRequired) return "policy_reack";
    return "app";
  }

  return "onboarding";
}

export function getRestrictedReason(input) {
  const { driverRow, driver, rejectionReason, temporaryAccess } = input;
  const onboardingRaw = driverRow?.onboarding_status ?? driver?.onboardingStatus;
  const accountStatus = normalizeAccountStatus(driverRow ?? { status: driver?.status, onboarding_status: onboardingRaw });

  if (accountStatus === "suspended") {
    return {
      title: "Account suspended",
      reason: rejectionReason ?? driver?.rejectionReason ?? "Your account has been suspended by the transport team.",
      guidance: "Contact your transport manager.",
    };
  }
  if (accountStatus === "offboarded") {
    return {
      title: "Account restricted",
      reason: "You are no longer registered as a driver with this operator.",
      guidance: "Contact your transport manager if you believe this is a mistake.",
    };
  }
  if (normalizeOnboardingStatus(onboardingRaw) === "rejected") {
    return {
      title: "Onboarding not approved",
      reason: rejectionReason ?? driver?.rejectionReason ?? "Your onboarding was not approved.",
      guidance: "Contact your transport manager for next steps.",
    };
  }
  if (
    temporaryAccess?.enabled &&
    temporaryAccess?.expiresAt &&
    new Date(temporaryAccess.expiresAt).getTime() < Date.now()
  ) {
    return {
      title: "Temporary access ended",
      reason: temporaryAccess.reason ?? "Your temporary access period has expired.",
      guidance: "Contact your transport manager to restore access.",
    };
  }
  return {
    title: "Account restricted",
    reason: rejectionReason ?? driver?.rejectionReason ?? "You cannot access jobs or vehicle checks right now.",
    guidance: "Contact your transport manager.",
  };
}

export function buildAccessContext(session, driver, extras = {}) {
  const onboardingRaw = driver?.onboardingStatus ?? session?.onboardingStatus;
  const dispatchBand = computeDispatchReadinessBand({
    onboardingStatus: onboardingRaw,
    accountStatus: normalizeAccountStatus({
      status: driver?.status,
      onboarding_status: onboardingRaw,
    }),
    blockers: extras.dispatchBlockers ?? [],
    warnings: extras.dispatchWarnings ?? [],
    policyReackRequired: (extras.outdatedPolicies ?? []).length > 0,
    temporaryAccessExpired: extras.temporaryAccessExpired ?? false,
  });

  if (session?.routeTarget === "session_error") {
    return {
      mode: "unlinked",
      onboardingStatus: normalizeOnboardingStatus(onboardingRaw),
      accountStatus: normalizeAccountStatus({ status: driver?.status, onboarding_status: onboardingRaw }),
      dispatchBand,
      isOnboardingEditable: false,
    };
  }

  return {
    mode: resolveDriverAccessMode({
      signedIn: Boolean(session?.userId),
      isDriverMember: session?.routeTarget !== "not_driver",
      driverProfileLinked: Boolean(driver),
      driverRow: extras.driverRow,
      driver,
      rejectionReason: driver?.rejectionReason ?? extras.rejectionReason,
      resubmitItems: extras.resubmitItems ?? [],
      policyReackRequired: (extras.outdatedPolicies ?? []).length > 0,
      dispatchBlockers: extras.dispatchBlockers ?? [],
      temporaryAccess: extras.temporaryAccess ?? null,
      operationalStatus: session?.operationalStatus ?? extras.operationalStatus ?? null,
    }),
    onboardingStatus: normalizeOnboardingStatus(onboardingRaw),
    accountStatus: normalizeAccountStatus({ status: driver?.status, onboarding_status: onboardingRaw }),
    dispatchBand,
    isOnboardingEditable: isOnboardingEditableStatus(onboardingRaw, {
      rejectionReason: driver?.rejectionReason ?? extras.rejectionReason,
      resubmitItems: extras.resubmitItems ?? [],
    }),
  };
}
