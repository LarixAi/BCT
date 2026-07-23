import { Capacitor } from "@capacitor/core";
import { AccessControl, BiometricAuthError, NativeBiometric } from "@capgo/capacitor-native-biometric";
import { verifyDriverIdentity } from "./biometric-service.js";

/** Namespace for biometric-protected refresh tokens in Keychain / Keystore. */
const REFRESH_KEY_PREFIX = "veyvio.driver.biometric.refresh";
const SECURE_READ_TIMEOUT_MS = 45000;
const SECURE_WRITE_TIMEOUT_MS = 45000;

/**
 * @typedef {'ok' | 'missing' | 'cancelled' | 'locked' | 'failed'} BiometricCredentialReadKind
 *
 * @typedef {{
 *   kind: BiometricCredentialReadKind,
 *   refreshToken?: string,
 *   message: string,
 * }} BiometricCredentialReadResult
 */

function refreshKey(driverId) {
  return `${REFRESH_KEY_PREFIX}.${String(driverId)}`;
}

/**
 * Supabase refresh tokens may be:
 * - v1 legacy: exactly 12 alphanumeric characters
 * - v2 / current: longer encoded strings
 * Reject empty / tiny garbage only — never treat a real short v1 token as expired.
 * @param {unknown} token
 * @returns {token is string}
 */
export function isPlausibleRefreshToken(token) {
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  if (trimmed.length < 12) return false;
  if (trimmed.length === 12) return /^[a-zA-Z0-9]+$/.test(trimmed);
  return true;
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} timeoutMessage
 * @returns {Promise<T>}
 */
function withRejectTimeout(promise, ms, timeoutMessage) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(new Error(timeoutMessage)), ms);
    }),
  ]).finally(() => {
    if (timer) globalThis.clearTimeout(timer);
  });
}

/**
 * Capacitor rejects with `code` as a string plugin error (see BiometricAuthError).
 * @param {unknown} err
 * @returns {number | null}
 */
function pluginErrorCode(err) {
  if (!err || typeof err !== "object") return null;
  const raw = /** @type {{ code?: unknown, errorCode?: unknown }} */ (err).code
    ?? /** @type {{ errorCode?: unknown }} */ (err).errorCode;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} err
 * @returns {BiometricCredentialReadKind}
 */
export function classifyBiometricCredentialError(err) {
  const code = pluginErrorCode(err);
  const message = err instanceof Error ? err.message : String(err ?? "");

  if (
    code === BiometricAuthError.USER_CANCEL ||
    code === BiometricAuthError.SYSTEM_CANCEL ||
    code === BiometricAuthError.APP_CANCEL ||
    code === BiometricAuthError.USER_FALLBACK ||
    /cancel/i.test(message)
  ) {
    return "cancelled";
  }

  if (
    code === BiometricAuthError.USER_LOCKOUT ||
    code === BiometricAuthError.USER_TEMPORARY_LOCKOUT
  ) {
    return "locked";
  }

  if (code === 21 || /no protected data|no data found|no credentials found/i.test(message)) {
    return "missing";
  }

  return "failed";
}

/**
 * Crypto-backed Keystore (AccessControl.BIOMETRY_*) requires Class 3 / strong biometrics.
 * On Android (especially Samsung), `strongBiometryIsAvailable` is often true while the OEM
 * still only exposes Class 2 (weak) sensors for crypto. Starting AuthActivity then crashes:
 * "Crypto-based authentication is not supported for Class 2 (Weak) biometrics."
 *
 * Always use AccessControl.NONE on Android and gate with verifyIdentity + getData instead.
 * iOS can still use BIOMETRY_ANY when strong biometry is available.
 * @returns {Promise<boolean>}
 */
async function deviceSupportsCryptoBiometrics() {
  if (Capacitor.getPlatform() === "android") {
    return false;
  }
  try {
    const result = await NativeBiometric.isAvailable({ useFallback: true });
    return Boolean(result?.isAvailable && result?.strongBiometryIsAvailable);
  } catch {
    return false;
  }
}

/**
 * Secure store for a revocable refresh token unlocked by device biometrics.
 * Passwords and long-lived access tokens must never be stored here.
 */
export const biometricCredentialStore = {
  async saveRefreshCredential({ driverId, refreshToken }) {
    if (!Capacitor.isNativePlatform()) {
      throw new Error("Biometric credential storage is only available on native devices.");
    }
    if (!driverId || !refreshToken) {
      throw new Error("driverId and refreshToken are required.");
    }

    const useCrypto = await deviceSupportsCryptoBiometrics();
    const payload = {
      key: refreshKey(driverId),
      value: refreshToken,
      // Strong biometrics only for crypto. Android always uses NONE (see deviceSupportsCryptoBiometrics).
      accessControl: useCrypto ? AccessControl.BIOMETRY_ANY : AccessControl.NONE,
      title: "Protect Driver session",
      negativeButtonText: "Cancel",
    };

    console.log(
      "[BIOMETRIC_DEBUG] saving token len=" + refreshToken.length + " prefix=" + refreshToken.slice(0, 6) + " useCrypto=" + useCrypto,
    );
    try {
      await withRejectTimeout(
        NativeBiometric.setData(payload),
        SECURE_WRITE_TIMEOUT_MS,
        "Protecting this device timed out. Try again.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "");
      // Last-resort: if a crypto write still somehow ran and failed, store without AuthActivity.
      if (useCrypto || /class 2|weak biometrics|crypto-based|AuthActivity/i.test(message)) {
        await withRejectTimeout(
          NativeBiometric.setData({ ...payload, accessControl: AccessControl.NONE }),
          SECURE_WRITE_TIMEOUT_MS,
          "Protecting this device timed out. Try again.",
        );
      } else {
        throw err;
      }
    }

    // Round-trip check without a second biometric prompt (NONE storage uses getData).
    // Crypto iOS storage can't be peeked without prompting — skip that platform check here.
    if (!useCrypto) {
      const peeked = await this.peekRefreshCredential(driverId);
      if (!isPlausibleRefreshToken(peeked) || peeked !== refreshToken) {
        await this.removeRefreshCredential(driverId).catch(() => undefined);
        throw new Error("Could not confirm fingerprint storage on this phone. Try again.");
      }
    }
  },

  /**
   * Read stored token without prompting. Android / NONE path only.
   * Returns null when missing or when crypto storage would require a prompt.
   * @param {string} driverId
   * @returns {Promise<string | null>}
   */
  async peekRefreshCredential(driverId) {
    if (!Capacitor.isNativePlatform() || !driverId) return null;
    if (await deviceSupportsCryptoBiometrics()) return null;
    try {
      const stored = await withRejectTimeout(
        NativeBiometric.getData({ key: refreshKey(driverId) }),
        8000,
        "peek timed out",
      );
      const value = typeof stored?.value === "string" ? stored.value : null;
      return value || null;
    } catch {
      return null;
    }
  },

  /**
   * Unlocks the stored refresh token.
   * Strong devices: getSecureData (OS crypto prompt).
   * Weak Class-2 devices: verifyIdentity then getData (no crypto AuthActivity).
   * @param {string} driverId
   * @returns {Promise<BiometricCredentialReadResult>}
   */
  async readRefreshCredential(driverId) {
    if (!Capacitor.isNativePlatform() || !driverId) {
      return { kind: "missing", message: "Biometric sign-in must be set up again." };
    }

    const useCrypto = await deviceSupportsCryptoBiometrics();

    try {
      if (!useCrypto) {
        const verified = await verifyDriverIdentity({ useFallback: true });
        if (!verified) {
          return {
            kind: "cancelled",
            message: "Authentication cancelled. No changes were made.",
          };
        }
        const stored = await withRejectTimeout(
          NativeBiometric.getData({ key: refreshKey(driverId) }),
          SECURE_READ_TIMEOUT_MS,
          "Fingerprint check timed out. Try again, or use your password.",
        );
        const refreshToken = stored?.value || null;
        console.log(
          "[BIOMETRIC_DEBUG] read (NONE) token len=" + (refreshToken ? refreshToken.length : "null") +
            " prefix=" + (refreshToken ? refreshToken.slice(0, 6) : "null"),
        );
        if (!isPlausibleRefreshToken(refreshToken)) {
          return { kind: "missing", message: "Biometric sign-in must be set up again." };
        }
        return { kind: "ok", refreshToken, message: "ok" };
      }

      const stored = await withRejectTimeout(
        NativeBiometric.getSecureData({
          key: refreshKey(driverId),
          reason: "Unlock Veyvio Driver",
          title: "Driver verification",
          subtitle: "Confirm that you are the assigned driver",
          description: "Use your device security to continue.",
          negativeButtonText: "Cancel",
        }),
        SECURE_READ_TIMEOUT_MS,
        "Fingerprint check timed out. Try again, or use your password.",
      );
      const refreshToken = stored?.value || null;
      if (!isPlausibleRefreshToken(refreshToken)) {
        return { kind: "missing", message: "Biometric sign-in must be set up again." };
      }
      return { kind: "ok", refreshToken, message: "ok" };
    } catch (err) {
      const kind = classifyBiometricCredentialError(err);
      console.log(
        "[BIOMETRIC_DEBUG] readRefreshCredential threw kind=" + kind + " raw=" +
          (err instanceof Error ? err.message : String(err)),
      );
      if (kind === "cancelled") {
        return {
          kind,
          message: "Authentication cancelled. No changes were made.",
        };
      }
      if (kind === "locked") {
        return {
          kind,
          message:
            "Biometric verification is temporarily locked. Unlock your phone with its PIN or passcode, then try again.",
        };
      }
      if (kind === "missing") {
        return { kind, message: "Biometric sign-in must be set up again." };
      }
      const message = err instanceof Error ? err.message : "";
      if (/timed out/i.test(message)) {
        return { kind: "failed", message };
      }
      if (/class 2|weak biometrics|crypto-based/i.test(message)) {
        return {
          kind: "failed",
          message:
            "This phone’s fingerprint cannot protect a crypto session. Sign in with your password, then set up biometric unlock again.",
        };
      }
      return {
        kind: "failed",
        message: "Could not unlock with device security. Try again, or use your password.",
      };
    }
  },

  /**
   * Non-prompting check — used before wiping enrollment after a failed unlock.
   * @param {string} driverId
   */
  async hasRefreshCredential(driverId) {
    if (!Capacitor.isNativePlatform() || !driverId) return false;
    try {
      const result = await NativeBiometric.isDataSaved({ key: refreshKey(driverId) });
      return Boolean(result?.isSaved);
    } catch {
      return false;
    }
  },

  async removeRefreshCredential(driverId) {
    if (!Capacitor.isNativePlatform() || !driverId) return;

    try {
      await NativeBiometric.deleteData({ key: refreshKey(driverId) });
    } catch {
      // Missing key is fine — treat as already cleared.
    }
  },
};

export async function saveBiometricCredential(input) {
  return biometricCredentialStore.saveRefreshCredential(input);
}

/**
 * @param {string} driverId
 * @returns {Promise<string | null>}
 * @deprecated Prefer readBiometricCredential — null conflates cancel with missing.
 */
export async function getBiometricCredential(driverId) {
  const result = await biometricCredentialStore.readRefreshCredential(driverId);
  return result.kind === "ok" ? result.refreshToken ?? null : null;
}

export async function readBiometricCredential(driverId) {
  return biometricCredentialStore.readRefreshCredential(driverId);
}

export async function hasBiometricCredential(driverId) {
  return biometricCredentialStore.hasRefreshCredential(driverId);
}

export async function peekBiometricCredential(driverId) {
  return biometricCredentialStore.peekRefreshCredential(driverId);
}

export async function removeBiometricCredential(driverId) {
  return biometricCredentialStore.removeRefreshCredential(driverId);
}
