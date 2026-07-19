import { isOnboardingEditableStatus } from "@/lib/onboarding-status";

/** @deprecated Use isOnboardingEditableStatus from onboarding-status.js */
export function isOnboardingEditable(onboardingStatus, options) {
  return isOnboardingEditableStatus(onboardingStatus, options);
}

export function onboardingLockMessage(onboardingStatus) {
  if (onboardingStatus === "compliance_review") {
    return "Your details have been submitted and are locked while the transport team reviews them.";
  }
  if (onboardingStatus === "approved") {
    return "Your onboarding is awaiting final activation.";
  }
  if (onboardingStatus === "rejected") {
    return "Your onboarding was rejected. Contact your transport manager for next steps.";
  }
  return "Onboarding is locked until your transport manager allows changes.";
}
