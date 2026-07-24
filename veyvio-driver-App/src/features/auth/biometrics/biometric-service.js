import { Capacitor } from "@capacitor/core";
import { BiometryType, NativeBiometric } from "@capgo/capacitor-native-biometric";

/**
 * @typedef {{ available: boolean, label: string, biometryType?: number }} BiometricAvailability
 */

function labelForBiometryType(biometryType) {
  switch (biometryType) {
    case BiometryType.FACE_ID:
      return "Face ID";
    case BiometryType.TOUCH_ID:
      return "Touch ID";
    case BiometryType.FINGERPRINT:
      return "Fingerprint";
    case BiometryType.FACE_AUTHENTICATION:
      return "Face recognition";
    case BiometryType.IRIS_AUTHENTICATION:
      return "Iris recognition";
    case BiometryType.MULTIPLE:
      return "Device biometrics";
    case BiometryType.DEVICE_CREDENTIAL:
      return "Device PIN";
    default:
      return "Biometric authentication";
  }
}

/**
 * Probe whether the OS can authenticate the driver (biometrics and/or device PIN).
 * Never receives or transmits biometric templates — only availability metadata.
 * @param {{ useFallback?: boolean }} [opts]
 * @returns {Promise<BiometricAvailability>}
 */
export async function checkBiometricAvailability(opts = {}) {
  if (!Capacitor.isNativePlatform()) {
    return {
      available: false,
      label: "Biometric authentication",
    };
  }

  const useFallback = opts.useFallback !== false;

  try {
    const result = await NativeBiometric.isAvailable({
      useFallback,
    });

    if (!result.isAvailable) {
      return {
        available: false,
        label: labelForBiometryType(result.biometryType),
        biometryType: result.biometryType,
      };
    }

    return {
      available: true,
      label: labelForBiometryType(result.biometryType),
      biometryType: result.biometryType,
    };
  } catch {
    return {
      available: false,
      label: "Biometric authentication",
    };
  }
}

/**
 * Give the native Activity a beat to finish layout before BiometricPrompt / AuthActivity.
 * Without this, Samsung and some Android WebViews show the prompt behind the lock overlay
 * or never surface it — the lock screen then feels frozen.
 */
export async function waitForNativeBiometricReady() {
  if (!Capacitor.isNativePlatform()) return;
  await new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      resolve();
    }
  });
  const delayMs = Capacitor.getPlatform() === "android" ? 450 : 150;
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}

/**
 * Ask the OS to confirm the current device user.
 * Veyvio only receives success/failure — never biometric templates.
 * @param {{ useFallback?: boolean, timeoutMs?: number, skipReadyDelay?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function verifyDriverIdentity(opts = {}) {
  if (!Capacitor.isNativePlatform()) return false;

  const useFallback = opts.useFallback !== false;
  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 15000;

  try {
    if (!opts.skipReadyDelay) {
      await waitForNativeBiometricReady();
    }
    await Promise.race([
      NativeBiometric.verifyIdentity({
        reason: "Unlock Veyvio Driver",
        title: "Driver verification",
        subtitle: "Confirm that you are the assigned driver",
        description: "Use your device security to continue.",
        useFallback,
      }),
      new Promise((_, reject) => {
        globalThis.setTimeout(() => reject(new Error("biometric_timeout")), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}
