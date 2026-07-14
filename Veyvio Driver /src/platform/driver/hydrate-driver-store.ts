import type { BootstrapPayload } from "@/data/mocks/bootstrap";
import { loadBootstrapCache } from "@/platform/storage/local-db";
import { useDriverStore } from "@/store/driver";

export function applyBootstrapToDriver(payload: BootstrapPayload): void {
  useDriverStore.getState().hydrateFromBootstrap(payload);
}

export async function hydrateDriverFromCache(depotId: string): Promise<boolean> {
  const cached = await loadBootstrapCache(depotId);
  if (!cached) return false;
  applyBootstrapToDriver(cached);
  return true;
}
