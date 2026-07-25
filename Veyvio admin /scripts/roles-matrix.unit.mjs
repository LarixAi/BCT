/**
 * Unit checks for roles permission matrix helpers (TD-008 / Gate 2).
 */
import assert from 'node:assert/strict'

function humanizeRoleKey(name) {
  return String(name ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function countUsersForRole(roleId, memberships) {
  return memberships.filter(
    (m) =>
      (m.status ?? 'active') === 'active' &&
      Array.isArray(m.roleIds) &&
      m.roleIds.includes(roleId),
  ).length
}

function buildRolesMatrix(input) {
  const byRole = new Map()
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

assert.equal(humanizeRoleKey('transport_manager'), 'Transport Manager')

const matrix = buildRolesMatrix({
  roles: [
    { id: 'r1', name: 'dispatcher', description: 'Dispatch board', isSystemRole: true, status: 'active' },
    { id: 'r2', name: 'viewer', status: 'active' },
  ],
  rolePermissions: [
    { roleId: 'r1', permissionCode: 'dispatch.manage', effect: 'allow' },
    { roleId: 'r1', permissionCode: 'bookings.read', effect: 'allow' },
    { roleId: 'r2', permissionCode: 'bookings.read', effect: 'allow' },
    { roleId: 'r2', permissionCode: 'dispatch.manage', effect: 'deny' },
  ],
  catalog: [
    { code: 'bookings.read', description: 'Read bookings', module: 'operations' },
    { code: 'dispatch.manage', description: 'Manage dispatch', module: 'dispatch' },
  ],
  memberships: [
    { roleIds: ['r1'], status: 'active' },
    { roleIds: ['r1', 'r2'], status: 'active' },
    { roleIds: ['r2'], status: 'suspended' },
  ],
})

assert.deepEqual(matrix.modules, ['dispatch', 'operations'])
assert.equal(matrix.roles[0].label, 'Dispatcher')
assert.equal(matrix.roles[0].userCount, 2)
assert.equal(matrix.roles[0].permissionCount, 2)
assert.deepEqual(matrix.roles[0].permissionCodes, ['bookings.read', 'dispatch.manage'])
assert.equal(matrix.roles[1].userCount, 1)
assert.deepEqual(matrix.roles[1].permissionCodes, ['bookings.read'])

console.log('roles-matrix.unit: ok')
