import { Capacitor } from "@capacitor/core";
import { AccessControl, NativeBiometric } from "@capgo/capacitor-native-biometric";

/** Namespace for biometric-protected refresh tokens in Keychain / Keystore. */
const REFRESH_KEY_PREFIX = "veyvio.driver.biometric.refresh";

/**
 * @typedef {{
 *   saveRefreshCredential: (input: { driverId: string, refreshToken: string }) => Promise<void>,
 *   getRefreshCredential: (driverId: string) => Promise<string | null>,
 *   removeRefreshCredential: (driverId: string) => Promise<void>,
 * }} BiometricCredentialStore
 */

function refreshKey(driverId) {
  return `${REFRESH_KEY_PREFIX}.${String(driverId)}`;
}

/**
 * Secure store for a revocable refresh token unlocked by device biometrics.
 * Passwords and long-lived access tokens must never be stored here.
 * @type {BiometricCredentialStore}
 */
export const biometricCredentialStore = {
  async saveRefreshCredential({ driverId, refreshToken }) {
    if (!Capacitor.isNativePlatform()) {
      throw new Error("Biometric credential storage is only available on native devices.");
    }
    if (!driverId || !refreshToken) {
      throw new Error("driverId and refreshToken are required.");
    }

    await NativeBiometric.setData({
      key: refreshKey(driverId),
      value: refreshToken,
      // Invalidated when the enrolled biometric set changes (new fingerprint/face).
      accessControl: AccessControl.BIOMETRY_CURRENT_SET,
      title: "Protect Driver session",
      negativeButtonText: "Cancel",
    });
  },

  /**
   * Unlocks the stored refresh token. The OS shows a biometric/PIN prompt.
   * Do not call verifyDriverIdentity() immediately before this — that causes a double prompt.
   */
  async getRefreshCredential(driverId) {
    if (!Capacitor.isNativePlatform() || !driverId) return null;

    try {
      const stored = await NativeBiometric.getSecureData({
        key: refreshKey(driverId),
        reason: "Unlock Veyvio Driver",
        title: "Driver verification",
        subtitle: "Confirm that you are the assigned driver",
        description: "Use your device security to continue.",
        negativeButtonText: "Cancel",
      });
      return stored?.value || null;
    } catch {
      return null;
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

export async function getBiometricCredential(driverId) {
  return biometricCredentialStore.getRefreshCredential(driverId);
}

export async function removeBiometricCredential(driverId) {
  return biometricCredentialStore.removeRefreshCredential(driverId);
}
