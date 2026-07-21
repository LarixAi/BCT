import { Capacitor } from "@capacitor/core";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  commandGetDriverDeviceStatus,
  commandPostDriverSecurityEvent,
  commandUpsertDriverDevice,
} from "@/lib/command-api";
import { getOrCreateDeviceKey } from "./device-id.js";
import { getBiometricPreference } from "./biometric-preference.js";
import { invalidateBiometricAccess } from "./biometric-enrollment.js";

async function accessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * @param {string} driverId
 * @param {{ biometricUnlock?: boolean }} [opts]
 */
export async function syncTrustedDeviceWithCommand(driverId, opts = {}) {
  if (!driverId || !Capacitor.isNativePlatform()) return { ok: false, skipped: true };

  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in" };

  const prefs = getBiometricPreference(driverId);
  const biometricUnlock = opts.biometricUnlock ?? prefs.enabled;
  const platform = Capacitor.getPlatform();

  return commandUpsertDriverDevice(token, {
    deviceKey: getOrCreateDeviceKey(),
    label: prefs.deviceName || (platform === "ios" ? "This iPhone" : "This Android phone"),
    platform,
    operatingSystem: platform,
    appVersion: import.meta.env.VITE_APP_VERSION ?? null,
    biometricUnlock,
    biometricMethod: prefs.label || null,
    lastBiometricUnlockAt: prefs.lastUnlockAt,
    locationAccess: "while_on_duty",
  });
}

/**
 * @param {string} action
 * @param {{ driverId?: string, reason?: string, metadata?: Record<string, unknown> }} [opts]
 */
export async function reportDriverSecurityEvent(action, opts = {}) {
  const token = await accessToken();
  if (!token) return { ok: false, skipped: true };

  const prefs = opts.driverId ? getBiometricPreference(opts.driverId) : null;
  return commandPostDriverSecurityEvent(token, {
    action,
    deviceKey: getOrCreateDeviceKey(),
    deviceLabel: prefs?.deviceName ?? null,
    biometricMethod: prefs?.label ?? null,
    reason: opts.reason ?? null,
    metadata: opts.metadata ?? {},
  });
}

/**
 * If Admin revoked this device, wipe local biometric trust.
 * @param {string} driverId
 * @returns {Promise<{ revoked: boolean, requirePassword: boolean }>}
 */
export async function enforceRemoteDeviceSecurity(driverId) {
  if (!driverId || !Capacitor.isNativePlatform()) {
    return { revoked: false, requirePassword: false };
  }

  const token = await accessToken();
  if (!token) return { revoked: false, requirePassword: false };

  const status = await commandGetDriverDeviceStatus(token, getOrCreateDeviceKey());
  if (!status.ok) return { revoked: false, requirePassword: false };

  if (status.securityStatus === "revoked") {
    await invalidateBiometricAccess(driverId);
    await reportDriverSecurityEvent("driver.biometric_credential_invalidated", {
      driverId,
      reason: "Device revoked by operator",
    }).catch(() => undefined);
    return { revoked: true, requirePassword: true };
  }

  if (status.requirePasswordNextLogin) {
    await invalidateBiometricAccess(driverId);
    return { revoked: false, requirePassword: true };
  }

  return { revoked: false, requirePassword: false };
}
