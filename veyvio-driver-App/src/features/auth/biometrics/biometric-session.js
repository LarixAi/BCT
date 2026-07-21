import { Capacitor } from "@capacitor/core";
import { checkBiometricAvailability, verifyDriverIdentity } from "./biometric-service.js";
import { DEFAULT_LOCK_AFTER_MINUTES } from "./biometric-policy.js";
import {
  clearBiometricUnlocked,
  isBiometricUnlockedThisSession,
  markBiometricUnlocked,
} from "./biometric-lock-state.js";
import { getBiometricPreference, saveBiometricPreference } from "./biometric-preference.js";
import { reportDriverSecurityEvent } from "./biometric-security-sync.js";

const LAST_DRIVER_KEY = "veyvio.driver.biometric.lastDriverId";

/**
 * @param {string} driverId
 */
export function rememberLastBiometricDriverId(driverId) {
  if (!driverId) return;
  try {
    localStorage.setItem(LAST_DRIVER_KEY, String(driverId));
  } catch {
    // ignore
  }
}

/** @returns {string | null} */
export function getLastBiometricDriverId() {
  try {
    return localStorage.getItem(LAST_DRIVER_KEY);
  } catch {
    return null;
  }
}

/**
 * Whether the UI should be covered by the biometric lock screen.
 * Pass `navigating: true` when external turn-by-turn navigation is active.
 * @param {{
 *   driverId: string | null | undefined,
 *   coldStart?: boolean,
 *   backgroundedForMs?: number | null,
 *   navigating?: boolean,
 * }} input
 */
export function shouldRequireBiometricLock(input) {
  const { driverId, coldStart = false, backgroundedForMs = null, navigating = false } = input;
  if (!driverId || !Capacitor.isNativePlatform()) return false;
  if (navigating) return false;

  const prefs = getBiometricPreference(driverId);
  if (!prefs.enabled) return false;

  if (coldStart && !isBiometricUnlockedThisSession()) return true;

  if (backgroundedForMs == null) return false;
  const lockAfterMinutes = prefs.lockAfterMinutes || DEFAULT_LOCK_AFTER_MINUTES;
  return backgroundedForMs >= lockAfterMinutes * 60 * 1000;
}

/**
 * App-lock unlock: OS biometric check only (session stays in place).
 * @param {string} driverId
 * @returns {Promise<{ ok: true, label: string } | { ok: false, message: string }>}
 */
export async function unlockBiometricAppLock(driverId) {
  if (!driverId) return { ok: false, message: "Driver account is not available." };

  const prefs = getBiometricPreference(driverId);
  const opts = { useFallback: prefs.useDevicePinFallback !== false };

  const availability = await checkBiometricAvailability(opts);
  if (!availability.available) {
    return { ok: false, message: `${availability.label} is not available on this device.` };
  }

  const verified = await verifyDriverIdentity(opts);
  if (!verified) {
    void reportDriverSecurityEvent("driver.biometric_unlock_failed", { driverId }).catch(() => undefined);
    return { ok: false, message: "Verification was cancelled." };
  }

  saveBiometricPreference(driverId, { lastUnlockAt: new Date().toISOString() });
  markBiometricUnlocked();
  void reportDriverSecurityEvent("driver.biometric_unlock_succeeded", { driverId }).catch(() => undefined);
  return { ok: true, label: availability.label };
}

export function resetBiometricLockOnSignOut() {
  clearBiometricUnlocked();
}
