const DEVICE_KEY = "veyvio.driver.deviceKey.v1";

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable per-install device key used for Command trusted-device tracking. */
export function getOrCreateDeviceKey() {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) {
      console.log("[BIOMETRIC_DEBUG] getOrCreateDeviceKey found existing=" + existing);
      return existing;
    }
    const next = randomId();
    localStorage.setItem(DEVICE_KEY, next);
    console.log("[BIOMETRIC_DEBUG] getOrCreateDeviceKey generated NEW=" + next);
    return next;
  } catch (err) {
    console.log("[BIOMETRIC_DEBUG] getOrCreateDeviceKey localStorage threw: " + (err instanceof Error ? err.message : String(err)));
    return randomId();
  }
}

export function clearLocalDeviceKey() {
  try {
    localStorage.removeItem(DEVICE_KEY);
  } catch {
    // ignore
  }
}
