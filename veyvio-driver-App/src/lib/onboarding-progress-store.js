/** Local checklist progress when Command lacks Ridova `driver_onboarding_steps`. */

const STORAGE_KEY = "veyvio.driver.onboardingProgress.v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* private mode / quota — hub still uses in-session inference */
  }
}

/**
 * @param {string} driverId
 * @returns {string[]} completed step keys
 */
export function getLocalCompletedOnboardingSteps(driverId) {
  if (!driverId) return [];
  const entry = readAll()[driverId];
  if (!entry || !Array.isArray(entry.completedStepKeys)) return [];
  return entry.completedStepKeys.filter((k) => typeof k === "string");
}

/**
 * @param {string} driverId
 * @param {string|string[]} stepKeys
 */
export function markLocalOnboardingStepsComplete(driverId, stepKeys) {
  if (!driverId) return;
  const keys = (Array.isArray(stepKeys) ? stepKeys : [stepKeys]).filter(Boolean);
  if (!keys.length) return;

  const all = readAll();
  const prev = getLocalCompletedOnboardingSteps(driverId);
  const merged = [...new Set([...prev, ...keys])];
  all[driverId] = {
    completedStepKeys: merged,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

/** Merge Command/server checklist without dropping local completions. */
export function syncServerOnboardingSteps(driverId, serverStepKeys) {
  if (!driverId || !Array.isArray(serverStepKeys) || !serverStepKeys.length) return;
  markLocalOnboardingStepsComplete(driverId, serverStepKeys);
}

/**
 * Merge template/remote steps with local completions and inferred server signals.
 * @param {Array<{ stepKey: string, status?: string, reviewStatus?: string|null }>} steps
 * @param {{ completedStepKeys?: string[], inferPersonalFromPhone?: boolean, phone?: string|null }} options
 */
export function applyOnboardingStepCompletions(steps, options = {}) {
  const completed = new Set(options.completedStepKeys ?? []);
  if (options.inferPersonalFromPhone && String(options.phone ?? "").trim()) {
    completed.add("personal_profile");
  }

  if (!completed.size) return steps;

  return (steps ?? []).map((step) => {
    if (!completed.has(step.stepKey)) return step;
    if (step.status && step.status !== "pending" && step.status !== "not_started") return step;
    // Driver finished this step — do not set reviewStatus "pending" here.
    // That forced orange "pending review" clocks on every completed hub row.
    return {
      ...step,
      status: "submitted",
      reviewStatus: step.reviewStatus ?? null,
    };
  });
}

/** Clear local completion for steps the driver must redo (e.g. activation training after doc approval). */
export function clearLocalOnboardingSteps(driverId, stepKeys) {
  if (!driverId) return;
  const keys = new Set((Array.isArray(stepKeys) ? stepKeys : [stepKeys]).filter(Boolean));
  if (!keys.size) return;
  const all = readAll();
  const prev = getLocalCompletedOnboardingSteps(driverId);
  const next = prev.filter((k) => !keys.has(k));
  if (next.length === prev.length) return;
  all[driverId] = {
    completedStepKeys: next,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

/** Attach device-local checklist progress to prefill payloads (Command has no Ridova step rows). */
export function attachLocalOnboardingProgress(driverId, prefill = {}) {
  if (!driverId) return prefill;
  return {
    ...prefill,
    driverId,
    localCompletedStepKeys: getLocalCompletedOnboardingSteps(driverId),
  };
}
