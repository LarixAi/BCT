/**
 * Wave 3E-2 — Driver Supabase auth session custody.
 *
 * Native (Android/iOS Capacitor): OS-backed Keychain / Keystore via
 * @capgo/capacitor-native-biometric with AccessControl.NONE (encrypted at rest,
 * no biometric prompt on every auto-refresh).
 *
 * Browser / Vite dev: localStorage fallback only when NOT a native platform.
 * Production mobile builds must never silently use the web fallback.
 */
import { Capacitor } from "@capacitor/core";
import { AccessControl, NativeBiometric } from "@capgo/capacitor-native-biometric";

const MEMORY = new Map();
const NATIVE_KEY_PREFIX = "veyvio.driver.supabase.auth.";
const LEGACY_AUTH_KEY_RE = /^sb-.*-auth-token$/;

export function isNativeDriverAuthCustody() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function custodyMode() {
  return isNativeDriverAuthCustody() ? "native_secure" : "browser_dev_fallback";
}

function nativeStorageKey(key) {
  return `${NATIVE_KEY_PREFIX}${String(key).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function purgeLegacyWebAuthTokens() {
  if (typeof localStorage === "undefined") return;
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && LEGACY_AUTH_KEY_RE.test(key)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

async function nativeGet(key) {
  try {
    const stored = await NativeBiometric.getData({ key: nativeStorageKey(key) });
    const value = typeof stored?.value === "string" ? stored.value : null;
    return value || null;
  } catch {
    return null;
  }
}

async function nativeSet(key, value) {
  await NativeBiometric.setData({
    key: nativeStorageKey(key),
    value: String(value ?? ""),
    accessControl: AccessControl.NONE,
    title: "Protect Driver session",
    negativeButtonText: "Cancel",
  });
}

async function nativeRemove(key) {
  try {
    await NativeBiometric.deleteData({ key: nativeStorageKey(key) });
  } catch {
    // missing is fine
  }
}

/**
 * Supabase SupportedStorage — async methods are supported by gotrue-js.
 */
export const driverAuthSessionStorage = {
  async getItem(key) {
    if (!key) return null;
    if (MEMORY.has(key)) return MEMORY.get(key);

    if (isNativeDriverAuthCustody()) {
      // One-time migration from WebView localStorage → native secure store.
      if (typeof localStorage !== "undefined") {
        try {
          const legacy = localStorage.getItem(key);
          if (legacy) {
            await nativeSet(key, legacy);
            localStorage.removeItem(key);
            MEMORY.set(key, legacy);
            purgeLegacyWebAuthTokens();
            return legacy;
          }
        } catch {
          // continue to native read
        }
      }
      const value = await nativeGet(key);
      if (value != null) MEMORY.set(key, value);
      return value;
    }

    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },

  async setItem(key, value) {
    if (!key) return;
    const next = String(value ?? "");
    MEMORY.set(key, next);

    if (isNativeDriverAuthCustody()) {
      await nativeSet(key, next);
      // Never leave a JS-readable copy behind after native write.
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.removeItem(key);
          purgeLegacyWebAuthTokens();
        } catch {
          // ignore
        }
      }
      return;
    }

    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, next);
  },

  async removeItem(key) {
    if (!key) return;
    MEMORY.delete(key);

    if (isNativeDriverAuthCustody()) {
      await nativeRemove(key);
    }

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  },
};

/** Clear all known Supabase auth keys from memory, native store, and any legacy web copies. */
export async function clearDriverAuthSessionStorage(storageKey) {
  MEMORY.clear();
  const keys = new Set();
  if (typeof storageKey === "string" && storageKey) keys.add(storageKey);

  if (typeof localStorage !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && LEGACY_AUTH_KEY_RE.test(key)) keys.add(key);
      }
    } catch {
      // ignore
    }
  }

  for (const key of keys) {
    await driverAuthSessionStorage.removeItem(key);
  }
  purgeLegacyWebAuthTokens();
}

/** Test helper — reset in-memory mirror between unit tests. */
export function __resetDriverAuthSessionMemoryForTests() {
  MEMORY.clear();
}
