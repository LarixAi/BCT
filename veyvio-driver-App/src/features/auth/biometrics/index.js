export {
  checkBiometricAvailability,
  verifyDriverIdentity,
} from "./biometric-service.js";

export {
  biometricCredentialStore,
  saveBiometricCredential,
  getBiometricCredential,
  removeBiometricCredential,
} from "./biometric-credential-store.js";

export {
  defaultBiometricPreference,
  getBiometricPreference,
  saveBiometricPreference,
  clearBiometricPreference,
  PROMPT_DONT_ASK,
  PROMPT_PENDING,
  PROMPT_REMIND,
} from "./biometric-preference.js";

export {
  DEFAULT_LOCK_AFTER_MINUTES,
  LOCK_AFTER_OPTIONS_MINUTES,
  BIOMETRIC_INVALIDATION_REASONS,
} from "./biometric-policy.js";

export {
  getCurrentRefreshToken,
  shouldOfferBiometricEnrollment,
  enableBiometricSignIn,
  rebindBiometricCredentialIfEnabled,
  remindBiometricEnrollmentNextWeek,
  declineBiometricEnrollmentPermanently,
  disableBiometricSignIn,
  invalidateBiometricAccess,
  removeTrustedDeviceLocally,
  unlockStoredRefreshToken,
} from "./biometric-enrollment.js";

export {
  rememberLastBiometricDriverId,
  getLastBiometricDriverId,
  shouldRequireBiometricLock,
  unlockBiometricAppLock,
  resetBiometricLockOnSignOut,
} from "./biometric-session.js";

export {
  markBiometricUnlocked,
  clearBiometricUnlocked,
  isBiometricUnlockedThisSession,
} from "./biometric-lock-state.js";

export { signInDriverWithBiometrics } from "./biometric-login.js";

export {
  getOrCreateDeviceKey,
  clearLocalDeviceKey,
} from "./device-id.js";

export {
  syncTrustedDeviceWithCommand,
  reportDriverSecurityEvent,
  enforceRemoteDeviceSecurity,
} from "./biometric-security-sync.js";

export { useBiometricEnrollmentPrompt } from "./use-biometric-enrollment-prompt.js";
export { default as BiometricEnrollmentHost } from "./BiometricEnrollmentHost.jsx";
