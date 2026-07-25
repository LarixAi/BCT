/** Stub — @base44/sdk must not ship in Command production builds (Blueprint F-03 / TD-003). */
export function createClient() {
  throw new Error("Base44 SDK is disabled. Command-only builds must not call legacy PHV paths.");
}

export default { createClient };
