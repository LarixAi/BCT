/**
 * In-memory app-lock unlock state for the current JS process.
 * Cleared on full process restart (cold start) so biometrics is required again.
 */

let unlockedThisJsSession = false;

export function markBiometricUnlocked() {
  unlockedThisJsSession = true;
}

export function clearBiometricUnlocked() {
  unlockedThisJsSession = false;
}

export function isBiometricUnlockedThisSession() {
  return unlockedThisJsSession;
}
