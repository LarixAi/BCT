/** Shared Ridova / Veyvio brand helpers used by veyvio-driver-App. */

export const RIDOVA_COLORS = {
  navy: "#0B1526",
  navySoft: "#152238",
  teal: "#4A8FA3",
  tealDark: "#2F6B7A",
  lime: "#7AB82E",
  limeDark: "#5F9420",
  slateMuted: "#667085",
  background: "#F5F7FA",
  white: "#FFFFFF",
} as const;

/** True when running inside a Capacitor native shell. */
export function isCapacitorNativeApp(): boolean {
  try {
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/**
 * Splash/welcome for installable Driver delivery (web + Capacitor).
 * Auth deep-links still skip the gate in DriverLaunchGate.
 */
export function shouldShowLaunchExperience(delivery: string): boolean {
  if (delivery === "installable" || delivery === "native") return true;
  return false;
}
