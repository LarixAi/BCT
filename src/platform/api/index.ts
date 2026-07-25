import { isMockApi } from "./config";
import { assertProductionApiConfig } from "./production-guards";
import { liveYardApi } from "./live-yard-api";
import { mockYardApi } from "./mock-yard-api";
import type { YardApi } from "./yard-api";

export function getYardApi(): YardApi {
  assertProductionApiConfig();
  if (isMockApi()) {
    if (import.meta.env.PROD) {
      throw new Error("Mock yard API is not permitted in production builds.");
    }
    return mockYardApi;
  }
  return liveYardApi;
}

export { isMockApi, getApiBaseUrl, usesCommandYardApi } from "./config";
export type { YardApi, PushMutationResult } from "./yard-api";
