/**
 * Demo / bypass helpers. Production builds must never grant operational state via URL or env.
 */

export function isDevRuntime(): boolean {
  return Boolean(import.meta.env.DEV);
}

/** Auth bypass is only valid when both DEV and env flag are set. */
export function isDevAuthBypassEnabled(): boolean {
  return isDevRuntime() && import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
}

/**
 * Demo search params (?demo=…) only apply in DEV.
 * In production-like builds they are ignored.
 */
export function resolveDemoParam<T extends string>(
  demo: T | undefined,
): T | undefined {
  if (!isDevRuntime()) return undefined;
  return demo;
}

/** Seeds that mutate duty state from a URL only run in DEV. */
export function canSeedOperationalDemo(): boolean {
  return isDevRuntime() && !import.meta.env.PROD;
}
