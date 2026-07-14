import { hasPermission } from "@/domain/permissions/has-permission";
import { usePermissionStore } from "./permission-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import type { YardPermission, YardRole } from "@/types/permissions";

export function useCan(permission: YardPermission): boolean {
  const role = useTenancyStore(s => s.role) as YardRole | null;
  const explicit = usePermissionStore(s => s.permissions);
  if (explicit.includes(permission)) return true;
  if (role) return hasPermission(role, permission);
  return false;
}
