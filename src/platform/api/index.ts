import { isMockApi } from "./config";
import { liveYardApi } from "./live-yard-api";
import { mockYardApi } from "./mock-yard-api";
import type { YardApi } from "./yard-api";

export function getYardApi(): YardApi {
  return isMockApi() ? mockYardApi : liveYardApi;
}

export { isMockApi, getApiBaseUrl, usesCommandYardApi } from "./config";
export type { YardApi, PushMutationResult } from "./yard-api";
