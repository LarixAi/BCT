import { Capacitor } from "@capacitor/core";
import { getSupabaseClient } from "@/lib/supabase/client";
import { checkBiometricAvailability, verifyDriverIdentity } from "./biometric-service.js";
import {
  hasBiometricCredential,
  isPlausibleRefreshToken,
  peekBiometricCredential,
  readBiometricCredential,
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
import {
  clearLastBiometricDriverId,
  rememberLastBiometricDriverId,
} from "./biometric-session.js";
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
 *
 * getSession() can hand back a stale cached session rather than the truly
 * current one — observed in practice: a session captured here was ~90
 * minutes older than the real active session, already past its access-token
 * expiry, with a refresh token long since superseded by later sign-ins. That
 * silently poisoned biometric enrollment with a dead token that would always
 * fail "Refresh Token Not Found" the next time it was used. Force a genuine
 * refresh whenever the cached session is missing or close to expiry so what
 * gets stored for biometric unlock is guaranteed current.
 * @returns {Promise<string | null>}
 */
export async function getCurrentRefreshToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  const nearOrPastExpiry = !expiresAtMs || expiresAtMs - Date.now() < 5 * 60_000;
  if (!nearOrPastExpiry) return session.refresh_token ?? null;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed?.session) return session.refresh_token ?? null;
  return refreshed.session.refresh_token ?? null;
}

/**
 * Wipe a broken enrollment so Home stops re-prompting with a dead fingerprint setup.
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
    // Stay pending so the driver can enroll again after a password sign-in —
    // but only once the new enroll path confirms storage works.
    promptStatus: PROMPT_PENDING,
    remindAfter: null,
  });
  clearLastBiometricDriverId();
}

/**
 * If prefs say enabled but no usable stored session exists, clear silently.
 * Used on the sign-in screen so we never show a dead fingerprint CTA.
 * @param {string} driverId
 * @returns {Promise<boolean>} true when enrollment still looks healthy
 */
export async function reconcileBiometricEnrollment(driverId) {
  if (!driverId || !Capacitor.isNativePlatform()) return false;
  const prefs = getBiometricPreference(driverId);
  if (!prefs.enabled) return false;

  const saved = await hasBiometricCredential(driverId).catch(() => false);
  if (!saved) {
    await invalidateBiometricAccess(driverId);
    return false;
  }

  // Android NONE storage: confirm the token is readable and long enough without prompting.
  if (Capacitor.getPlatform() === "android") {
    const peeked = await peekBiometricCredential(driverId);
    if (!isPlausibleRefreshToken(peeked)) {
      await invalidateBiometricAccess(driverId);
      return false;
    }
  }

  return true;
}

/**
 * Whether progressive enrollment UI may be shown for this driver.
 * @param {string} driverId
 * @param {{ now?: Date }} [opts]
 */
export async function shouldOfferBiometricEnrollment(driverId, opts = {}) {
  if (!driverId || !Capacitor.isNativePlatform()) return false;

  let prefs = getBiometricPreference(driverId);
  if (prefs.enabled) {
    const healthy = await reconcileBiometricEnrollment(driverId);
    if (healthy) return false;
    prefs = getBiometricPreference(driverId);
  }
  if (prefs.promptStatus === PROMPT_DONT_ASK) return false;
  if (prefs.promptStatus === PROMPT_REMIND && prefs.remindAfter) {
    const now = opts.now ?? new Date();
    if (now.getTime() < new Date(prefs.remindAfter).getTime()) return false;
  }

  const availability = await checkBiometricAvailability(fallbackOpts(driverId));
  return availability.available;
}

/**
 * Explicit opt-in: verify identity, store refresh token, confirm round-trip, then mark enabled.
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

  const refreshToken = await getCurrentRefreshToken();
  if (!isPlausibleRefreshToken(refreshToken)) {
    return {
      ok: false,
      message:
        "Could not read your signed-in session for fingerprint setup. Close this sheet, wait a moment, then try again. If it keeps failing, sign out and sign back in.",
    };
  }

  // Clear any leftover crypto / broken entries from earlier failed setups.
  await removeBiometricCredential(driverId).catch(() => undefined);

  const verified = await verifyDriverIdentity(opts);
  if (!verified) {
    return { ok: false, message: "Verification was cancelled. Biometric sign-in was not enabled." };
  }

  try {
    await saveBiometricCredential({ driverId, refreshToken });
  } catch (err) {
    await removeBiometricCredential(driverId).catch(() => undefined);
    const message = err instanceof Error ? err.message : "";
    if (/cancel/i.test(message)) {
      return { ok: false, message: "Verification was cancelled. Biometric sign-in was not enabled." };
    }
    if (/confirm fingerprint storage|class 2|weak biometrics|crypto-based/i.test(message)) {
      return {
        ok: false,
        message: message.includes("confirm")
          ? message
          : "This phone could not finish fingerprint setup. Try again, or use your password.",
      };
    }
    return { ok: false, message: "Could not protect your session on this device. Try again." };
  }

  // Final confirmation before flipping enabled — never mark enabled without a stored token.
  const saved = await hasBiometricCredential(driverId).catch(() => false);
  if (!saved) {
    await invalidateBiometricAccess(driverId);
    return { ok: false, message: "Fingerprint setup did not finish on this phone. Try again." };
  }
  if (Capacitor.getPlatform() === "android") {
    const peeked = await peekBiometricCredential(driverId);
    if (!isPlausibleRefreshToken(peeked) || peeked !== refreshToken) {
      await invalidateBiometricAccess(driverId);
      return { ok: false, message: "Fingerprint setup did not finish on this phone. Try again." };
    }
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
 * Keep stored refresh token current after password login or TOKEN_REFRESHED.
 * Does nothing when biometric sign-in is off.
 * Callers must NOT await this on the critical auth UI path.
 * @param {string} driverId
 */
export async function rebindBiometricCredentialIfEnabled(driverId) {
  if (!driverId || !Capacitor.isNativePlatform()) return;

  const prefs = getBiometricPreference(driverId);
  void syncTrustedDeviceWithCommand(driverId, { biometricUnlock: prefs.enabled }).catch(() => undefined);
  if (!prefs.enabled) return;

  const refreshToken = await getCurrentRefreshToken();
  if (!isPlausibleRefreshToken(refreshToken)) return;

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
  clearLastBiometricDriverId();
  void syncTrustedDeviceWithCommand(driverId, { biometricUnlock: false }).catch(() => undefined);
  void reportDriverSecurityEvent("driver.biometric_disabled", { driverId }).catch(() => undefined);
}

/**
 * Clear local biometric trust for this phone (Admin revoke arrives later).
 * Caller should sign the driver out afterwards.
 * @param {string} driverId
 */
export async function removeTrustedDeviceLocally(driverId) {
  if (!driverId) return;
  await invalidateBiometricAccess(driverId);
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
 * Cancel / lockout / soft failure must NOT clear enrollment — that was hiding
 * the auth-page biometric button after a cancelled fingerprint prompt.
 * Missing / corrupt storage must clear enrollment so Home can offer a clean setup.
 * @param {string} driverId
 * @returns {Promise<string>}
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

  const read = await readBiometricCredential(driverId);
  if (read.kind === "ok" && isPlausibleRefreshToken(read.refreshToken)) {
    saveBiometricPreference(driverId, { lastUnlockAt: new Date().toISOString() });
    return read.refreshToken;
  }

  if (read.kind === "missing" || (read.kind === "ok" && !isPlausibleRefreshToken(read.refreshToken))) {
    await invalidateBiometricAccess(driverId);
    throw new Error("Biometric sign-in must be set up again");
  }

  // cancelled | locked | failed — keep enrollment so the auth CTA stays visible
  throw new Error(read.message || "Could not unlock with device security.");
}
