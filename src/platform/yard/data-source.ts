import type { BootstrapDataSource } from "@/data/mocks/bootstrap";
import { isMockApi } from "@/platform/api/config";

export function isDevBypassAuth(): boolean {
  return import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
}

/** True when the UI should show demo fleet, fixture drivers, and local-only mutations. */
export function isDemoDataSource(dataSource?: BootstrapDataSource | null): boolean {
  if (isMockApi() || isDevBypassAuth()) return true;
  return dataSource !== "command-hub";
}

export function usesLiveCommandData(dataSource?: BootstrapDataSource | null): boolean {
  return !isDemoDataSource(dataSource) && dataSource === "command-hub";
}
