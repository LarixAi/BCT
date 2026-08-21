import { usePermissionStore } from "./permission-store";
import type { YardPermission } from "@/types/permissions";

/**
 * Wave 3D: authorize from server-projected permissions only.
 * Never re-derive from a single display role (roleKeys[0] / tenancy.role).
 */
export function useCan(permission: YardPermission): boolean {
  return usePermissionStore((s) => s.permissions.includes(permission));
}
