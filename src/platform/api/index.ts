import { isMockApi } from "./config";
import { assertProductionApiConfig } from "./production-guards";
import { liveYardApi } from "./live-yard-api";
import type { YardApi } from "./yard-api";

/**
 * Unified Yard API — live Command by default.
 * Mock adapter is dynamically imported only when VITE_USE_MOCK_API=true so
 * production bundles can drop the mock graph (F-03 / TD-023).
 */
const mockModule =
  import.meta.env.VITE_USE_MOCK_API === "true" ? await import("./mock-yard-api") : null;

export function getYardApi(): YardApi {
  assertProductionApiConfig();
  if (isMockApi()) {
    if (import.meta.env.PROD) {
      throw new Error("Mock yard API is not permitted in production builds.");
    }
    if (!mockModule) {
      throw new Error("Mock yard API requested but mock module was not loaded at build time.");
    }
    return mockModule.mockYardApi;
  }
  return liveYardApi;
}

export { isMockApi, getApiBaseUrl, usesCommandYardApi } from "./config";
export type { YardApi, PushMutationResult } from "./yard-api";
