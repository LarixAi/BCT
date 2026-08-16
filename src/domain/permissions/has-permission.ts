import { ROLE_PERMISSIONS, type YardPermission, type YardRole } from "@/types/permissions";

/** Union of matrix grants across roles. Order must not change the result. */
export function permissionsForRoles(roles: readonly (YardRole | null | undefined)[]): YardPermission[] {
  const granted = new Set<YardPermission>();
  for (const role of roles) {
    if (!role) continue;
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return [...granted];
}

/**
 * Yard UI helper. Prefer server-projected permission lists in production;
 * this matrix is a local fallback for mocks/tests only.
 */
export function hasPermission(
  roleOrRoles: YardRole | readonly YardRole[] | null | undefined,
  permission: YardPermission,
): boolean {
  if (!roleOrRoles) return false;
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return permissionsForRoles(roles).includes(permission);
}
