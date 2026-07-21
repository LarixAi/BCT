/**
 * App-lock policy constants for biometric unlock.
 * Lock prompts must not interrupt active navigation.
 */

/** No prompt when returning within this window (minutes). */
export const DEFAULT_LOCK_AFTER_MINUTES = 2;

/** Allowed "Require authentication after" choices in Security settings. */
export const LOCK_AFTER_OPTIONS_MINUTES = [2, 5, 15];

/**
 * Situations that should clear the local biometric credential.
 * Server eligibility (suspended, revoked device) still always wins on refresh.
 */
export const BIOMETRIC_INVALIDATION_REASONS = Object.freeze({
  DEVICE_BIOMETRICS_CHANGED: "device_biometrics_changed",
  DRIVER_SUSPENDED: "driver_suspended",
  DEVICE_REVOKED: "device_revoked",
  USER_DISABLED: "user_disabled",
  CREDENTIAL_MISSING: "credential_missing",
});
