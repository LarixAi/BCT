/**
 * Non-secret biometric preference metadata.
 * Safe for ordinary storage — never put refresh tokens or passwords here.
 */

const PREFS_KEY = "veyvio.driver.biometric.prefs.v1";

/** Driver declined the progressive offer forever (can still enable from Security later). */
export const PROMPT_DONT_ASK = "dont_ask";
/** Driver chose “Remind me next week”. */
export const PROMPT_REMIND = "remind";
/** No decision yet — eligible to be offered. */
export const PROMPT_PENDING = "pending";

/**
 * @typedef {{
 *   enabled: boolean,
 *   enabledAt: string | null,
 *   label: string | null,
 *   lockAfterMinutes: number,
 *   useDevicePinFallback: boolean,
 *   lastUnlockAt: string | null,
 *   deviceName: string | null,
 *   promptStatus: 'pending' | 'remind' | 'dont_ask',
 *   remindAfter: string | null,
 * }} BiometricPreference
 */

/** @returns {Record<string, BiometricPreference>} */
function readAll() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, BiometricPreference>} all */
function writeAll(all) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(all));
}

/** @returns {BiometricPreference} */
export function defaultBiometricPreference() {
  return {
    enabled: false,
    enabledAt: null,
    label: null,
    lockAfterMinutes: 2,
    useDevicePinFallback: true,
    lastUnlockAt: null,
    deviceName: null,
    promptStatus: PROMPT_PENDING,
    remindAfter: null,
  };
}

/**
 * @param {string} driverId
 * @returns {BiometricPreference}
 */
export function getBiometricPreference(driverId) {
  if (!driverId) return defaultBiometricPreference();
  const all = readAll();
  return { ...defaultBiometricPreference(), ...(all[String(driverId)] || {}) };
}

/**
 * Find any driver on this phone with biometric sign-in enabled.
 * Prefers the last-used driver id when that enrolment is still active.
 * @param {string | null | undefined} preferredDriverId
 * @returns {{ driverId: string, prefs: BiometricPreference } | null}
 */
export function findEnabledBiometricEnrollment(preferredDriverId = null) {
  const all = readAll();
  const preferred = preferredDriverId ? String(preferredDriverId) : null;
  if (preferred) {
    const prefs = { ...defaultBiometricPreference(), ...(all[preferred] || {}) };
    if (prefs.enabled) return { driverId: preferred, prefs };
  }
  for (const [driverId, stored] of Object.entries(all)) {
    const prefs = { ...defaultBiometricPreference(), ...stored };
    if (prefs.enabled) return { driverId, prefs };
  }
  return null;
}

/**
 * @param {string} driverId
 * @param {Partial<BiometricPreference>} patch
 * @returns {BiometricPreference}
 */
export function saveBiometricPreference(driverId, patch) {
  if (!driverId) throw new Error("driverId is required.");
  const all = readAll();
  const next = {
    ...defaultBiometricPreference(),
    ...(all[String(driverId)] || {}),
    ...patch,
  };
  all[String(driverId)] = next;
  writeAll(all);
  return next;
}

/**
 * @param {string} driverId
 */
export function clearBiometricPreference(driverId) {
  if (!driverId) return;
  const all = readAll();
  delete all[String(driverId)];
  writeAll(all);
}
