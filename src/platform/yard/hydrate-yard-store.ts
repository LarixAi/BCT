import { normalizeBootstrapPayload, type BootstrapPayload } from "@/data/mocks/bootstrap";
import { getYardApi } from "@/platform/api";
import { loadBootstrapCache, saveBootstrapCache } from "@/platform/storage/local-db";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import { useYard } from "@/store/yard";
import type { YardPermission, YardRole } from "@/types/permissions";

export function applyBootstrapToYard(payload: BootstrapPayload): void {
  const normalized = normalizeBootstrapPayload(payload);
  useYard.getState().hydrateFromBootstrap(normalized);
  usePermissionStore.getState().setPermissions(normalized.permissions as YardPermission[]);
}

export async function hydrateYardFromCache(companyId: string, depotId: string): Promise<boolean> {
  const cached = await loadBootstrapCache(companyId, depotId);
  if (!cached) return false;
  applyBootstrapToYard(cached);
  return true;
}

/**
 * Preferred hydrate path: cache first for instant UI, then refresh via YardApi
 * (mock or live). Always goes through the API adapter — never fixtures from UI.
 */
export async function hydrateYardFromApi(input: {
  companyId: string;
  depotId: string;
  role?: YardRole;
}): Promise<{ fromCache: boolean; refreshed: boolean; error?: string }> {
  const { companyId, depotId, role = "yard_manager" } = input;
  const fromCache = await hydrateYardFromCache(companyId, depotId);

  try {
    const payload = await getYardApi().fetchBootstrap(companyId, depotId, role);
    try {
      await saveBootstrapCache(payload);
    } catch {
      /* IndexedDB may be unavailable (SSR / tests) — store hydrate still proceeds */
    }
    applyBootstrapToYard(payload);
    return { fromCache, refreshed: true };
  } catch (e) {
    if (fromCache) {
      return {
        fromCache: true,
        refreshed: false,
        error: e instanceof Error ? e.message : "Could not refresh yard data",
      };
    }
    return {
      fromCache: false,
      refreshed: false,
      error: e instanceof Error ? e.message : "Could not load yard data",
    };
  }
}
