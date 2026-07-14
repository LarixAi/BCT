import { normalizeBootstrapPayload, type BootstrapPayload } from "@/data/mocks/bootstrap";
import { loadBootstrapCache } from "@/platform/storage/local-db";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import { useYard } from "@/store/yard";
import type { YardPermission } from "@/types/permissions";

export function applyBootstrapToYard(payload: BootstrapPayload): void {
  const normalized = normalizeBootstrapPayload(payload);
  useYard.getState().hydrateFromBootstrap(normalized);
  usePermissionStore.getState().setPermissions(normalized.permissions as YardPermission[]);
}

export async function hydrateYardFromCache(depotId: string): Promise<boolean> {
  const cached = await loadBootstrapCache(depotId);
  if (!cached) return false;
  applyBootstrapToYard(cached);
  return true;
}
