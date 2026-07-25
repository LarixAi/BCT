/**
 * Pure helpers for Command roles + permission matrix (TD-008 / Gate 2).
 * Used by Admin UI tests; command-api mirrors the same shape.
 */

export type PermissionCatalogRow = {
  code: string
  description: string
  module: string
}

export type RolePermissionRow = {
  roleId: string
  permissionCode: string
  effect: 'allow' | 'deny'
}

export type RoleRow = {
  id: string
  name: string
  description?: string
  isSystemRole?: boolean
  status?: string
}

export function humanizeRoleKey(name: string): string {
  return String(name ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function countUsersForRole(
  roleId: string,
  memberships: Array<{ roleIds?: string[] | null; status?: string | null }>,
): number {
  return memberships.filter(
    (m) =>
      (m.status ?? 'active') === 'active' &&
      Array.isArray(m.roleIds) &&
      m.roleIds.includes(roleId),
  ).length
}

export function buildRolesMatrix(input: {
  roles: RoleRow[]
  rolePermissions: RolePermissionRow[]
  catalog: PermissionCatalogRow[]
  memberships: Array<{ roleIds?: string[] | null; status?: string | null }>
}) {
  const byRole = new Map<string, RolePermissionRow[]>()
  for (const row of input.rolePermissions) {
    const list = byRole.get(row.roleId) ?? []
    list.push(row)
    byRole.set(row.roleId, list)
  }

  const modules = [...new Set(input.catalog.map((p) => p.module))].sort()

  return {
    modules,
    catalog: input.catalog,
    roles: input.roles.map((role) => {
      const granted = byRole.get(role.id) ?? []
      const allowCodes = new Set(
        granted.filter((g) => g.effect === 'allow').map((g) => g.permissionCode),
      )
      return {
        id: role.id,
        roleKey: role.name,
        label: humanizeRoleKey(role.name),
        description: role.description ?? '',
        isSystemRole: Boolean(role.isSystemRole),
        status: role.status ?? 'active',
        userCount: countUsersForRole(role.id, input.memberships),
        permissionCodes: [...allowCodes].sort(),
        permissionCount: allowCodes.size,
      }
    }),
  }
}
