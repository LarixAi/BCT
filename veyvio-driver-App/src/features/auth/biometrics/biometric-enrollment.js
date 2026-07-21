import { Capacitor } from "@capacitor/core";
import { getSupabaseClient } from "@/lib/supabase/client";
import { checkBiometricAvailability, verifyDriverIdentity } from "./biometric-service.js";
import {
  getBiometricCredential,
  removeBiometricCredential,
  saveBiometricCredential,
} from "./biometric-credential-store.js";
import {
  getBiometricPreference,
  PROMPT_DONT_ASK,
  PROMPT_PENDING,
  PROMPT_REMIND,
  saveBiometricPreference,
} from "./biometric-preference.js";
import { markBiometricUnlocked } from "./biometric-lock-state.js";
import { rememberLastBiometricDriverId } from "./biometric-session.js";
import {
  reportDriverSecurityEvent,
  syncTrustedDeviceWithCommand,
} from "./biometric-security-sync.js";

const REMIND_MS = 7 * 24 * 60 * 60 * 1000;

function fallbackOpts(driverId) {
  const prefs = driverId ? getBiometricPreference(driverId) : null;
  return { useFallback: prefs?.useDevicePinFallback !== false };
}

function defaultDeviceName() {
  try {
    const platform = Capacitor.getPlatform?.() ?? "web";
    if (platform === "ios") return "This iPhone";
    if (platform === "android") return "This Android phone";
  } catch {
    // ignore
  }
  return "This device";
}

/**
 * Read the current Supabase refresh token (session secret — never log it).
 * @returns {Promise<string | null>}
 */
export async function getCurrentRefreshToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.refresh_token ?? null;
}

/**
 * Whether progressive enrollment UI may be shown for this driver.
 * @param {string} driverId
 * @param {{ now?: Date }} [opts]
 */
export async function shouldOfferBiometricEnrollment(driverId, opts = {}) {
  if (!driverId || !Capacitor.isNativePlatform()) return false;

  const prefs = getBiometricPreference(driverId);
  if (prefs.enabled) return false;
  if (prefs.promptStatus === PROMPT_DONT_ASK) return false;
  if (prefs.promptStatus === PROMPT_REMIND && prefs.remindAfter) {
    const now = opts.now ?? new Date();
    if (now.getTime() < new Date(prefs.remindAfter).getTime()) return false;
  }

  const availability = await checkBiometricAvailability(fallbackOpts(driverId));
  return availability.available;
}

/**
 * Explicit opt-in: verify identity, then store the revocable refresh token.
 * @param {string} driverId
 * @returns {Promise<{ ok: true, label: string } | { ok: false, message: string }>}
 */
export async function enableBiometricSignIn(driverId) {
  if (!driverId) return { ok: false, message: "Driver account is not available." };
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, message: "Biometric sign-in is only available on the phone app." };
  }

  const opts = fallbackOpts(driverId);
  const availability = await checkBiometricAvailability(opts);
  if (!availability.available) {
    return { ok: false, message: `${availability.label} is not available on this device.` };
  }

  const verified = await verifyDriverIdentity(opts);
  if (!verified) {
    return { ok: false, message: "Verification was cancelled. Biometric sign-in was not enabled." };
  }

  const refreshToken = await getCurrentRefreshToken();
  if (!refreshToken) {
    return { ok: false, message: "Your session expired. Sign in with your password, then try again." };
  }

  try {
    await saveBiometricCredential({ driverId, refreshToken });
  } catch {
    return { ok: false, message: "Could not protect your session on this device. Try again." };
  }

  const prefs = getBiometricPreference(driverId);
  saveBiometricPreference(driverId, {
    enabled: true,
    enabledAt: new Date().toISOString(),
    label: availability.label,
    promptStatus: PROMPT_PENDING,
    remindAfter: null,
    deviceName: prefs.deviceName || defaultDeviceName(),
  });
  rememberLastBiometricDriverId(driverId);
  markBiometricUnlocked();
  void syncTrustedDeviceWithCommand(driverId, { biometricUnlock: true }).catch(() => undefined);
  void reportDriverSecurityEvent("driver.biometric_enabled", {
    driverId,
    metadata: { method: availability.label },
  }).catch(() => undefined);

  return { ok: true, label: availability.label };
}

/**
 * Keep Keychain/Keystore refresh token current after password login or TOKEN_REFRESHED.
 * Does nothing when biometric sign-in is off.
 * @param {string} driverId
 */
export async function rebindBiometricCredentialIfEnabled(driverId) {
  if (!driverId || !Capacitor.isNativePlatform()) return;

  const prefs = getBiometricPreference(driverId);
  // Always refresh trusted-device last-seen when signed in on native.
  void syncTrustedDeviceWithCommand(driverId, { biometricUnlock: prefs.enabled }).catch(() => undefined);
  if (!prefs.enabled) return;

  const refreshToken = await getCurrentRefreshToken();
  if (!refreshToken) return;

  try {
    await saveBiometricCredential({ driverId, refreshToken });
  } catch {
    // Leave preference enabled — driver can re-enable from Security if storage fails.
  }
}

/**
 * @param {string} driverId
 */
export function remindBiometricEnrollmentNextWeek(driverId) {
  if (!driverId) return;
  saveBiometricPreference(driverId, {
    promptStatus: PROMPT_REMIND,
    remindAfter: new Date(Date.now() + REMIND_MS).toISOString(),
  });
}

/**
 * @param {string} driverId
 */
export function declineBiometricEnrollmentPermanently(driverId) {
  if (!driverId) return;
  saveBiometricPreference(driverId, {
    promptStatus: PROMPT_DONT_ASK,
    remindAfter: null,
  });
}

/**
 * Turn off biometric sign-in and remove the protected refresh token.
 * @param {string} driverId
 */
export async function disableBiometricSignIn(driverId) {
  if (!driverId) return;
  await removeBiometricCredential(driverId);
  saveBiometricPreference(driverId, {
    enabled: false,
    enabledAt: null,
    label: null,
    lastUnlockAt: null,
  });
  void syncTrustedDeviceWithCommand(driverId, { biometricUnlock: false }).catch(() => undefined);
  void reportDriverSecurityEvent("driver.biometric_disabled", { driverId }).catch(() => undefined);
}

/**
 * Full wipe used when the account is suspended / device revoked.
 * @param {string} driverId
 */
export async function invalidateBiometricAccess(driverId) {
  if (!driverId) return;
  await removeBiometricCredential(driverId);
  saveBiometricPreference(driverId, {
    enabled: false,
    enabledAt: null,
    label: null,
    lastUnlockAt: null,
  });
}

/**
 * Clear local biometric trust for this phone (Admin revoke arrives later).
 * Caller should sign the driver out afterwards.
 * @param {string} driverId
 */
export async function removeTrustedDeviceLocally(driverId) {
  if (!driverId) return;
  await invalidateBiometricAccess(driverId);
  try {
    localStorage.removeItem("veyvio.driver.biometric.lastDriverId");
  } catch {
    // ignore
  }
  saveBiometricPreference(driverId, {
    promptStatus: PROMPT_DONT_ASK,
    remindAfter: null,
    deviceName: null,
  });
  void syncTrustedDeviceWithCommand(driverId, { biometricUnlock: false }).catch(() => undefined);
  void reportDriverSecurityEvent("driver.device_revoked", {
    driverId,
    reason: "Removed from this phone by the driver",
  }).catch(() => undefined);
}

/**
 * Unlock path helper — biometric gate then return refresh token.
 * @param {string} driverId
 */
export async function unlockStoredRefreshToken(driverId) {
  const prefs = getBiometricPreference(driverId);
  if (!prefs.enabled) {
    throw new Error("Biometric sign-in is not enabled");
  }

  const availability = await checkBiometricAvailability(fallbackOpts(driverId));
  if (!availability.available) {
    throw new Error("Biometric authentication is not available");
  }

  // getSecureData prompts the OS — do not call verifyDriverIdentity() first.
  const refreshToken = await getBiometricCredential(driverId);
  if (!refreshToken) {
    saveBiometricPreference(driverId, { enabled: false, enabledAt: null });
    throw new Error("Biometric sign-in must be set up again");
  }

  saveBiometricPreference(driverId, { lastUnlockAt: new Date().toISOString() });
  return refreshToken;
}
