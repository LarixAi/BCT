/**
 * Client-side sign-on gate derived from Command bootstrap projection.
 * Server enforcement lives in evaluateDriverSignOnEligibility (command-api).
 */

function normalizeBlocker(entry) {
  if (typeof entry === "string") return entry.trim();
  if (entry?.message) return String(entry.message).trim();
  if (entry?.code) return String(entry.code).trim();
  return "";
}

/** @returns {string[]} Operational reasons sign-on must be blocked in the UI. */
export function getDutySignOnBlockers({ duty, bootstrap } = {}) {
  const blockers = [];

  const eligibility = bootstrap?.eligibility;
  if (eligibility?.allowed === false) {
    for (const entry of eligibility.blockers ?? []) {
      const message = normalizeBlocker(entry);
      if (message) blockers.push(message);
    }
  }

  const vehicleCheck = duty?.vehicleCheck;
  if (vehicleCheck?.canStartDuty === false) {
    if (vehicleCheck.status === "failed") {
      blockers.push("Vehicle check failed — speak to dispatch before signing on.");
    } else if (vehicleCheck.status !== "complete") {
      blockers.push("Complete today's vehicle check before signing on.");
    }
  }

  return [...new Set(blockers)];
}

export function canSignOnForDuty({ duty, bootstrap } = {}) {
  return getDutySignOnBlockers({ duty, bootstrap }).length === 0;
}
