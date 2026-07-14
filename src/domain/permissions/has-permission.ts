import { ROLE_PERMISSIONS, type YardPermission, type YardRole } from "@/types/permissions";

export function hasPermission(role: YardRole | null | undefined, permission: YardPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
