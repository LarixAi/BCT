/**
 * Driver navigation routing config (build-time env).
 *
 * VITE_DRIVER_NAV_TEST_MODE=true
 *   Never call Google / driver-route. Uses free OSRM only — zero Google quota.
 *
 * VITE_DRIVER_NAV_USE_GOOGLE=false
 *   Same behaviour as test mode (alias for production builds).
 *
 * Default: try Google Essentials via edge function (monthly cap), OSRM fallback.
 */

function isTruthyEnv(value) {
  return value === "true" || value === "1";
}

export function isDriverNavTestMode() {
  if (isTruthyEnv(import.meta.env.VITE_DRIVER_NAV_TEST_MODE)) return true;
  if (import.meta.env.VITE_DRIVER_NAV_USE_GOOGLE === "false") return true;
  return false;
}

export function driverNavModeLabel() {
  return isDriverNavTestMode() ? "Test routing (OSRM)" : "Live routing (Google)";
}
