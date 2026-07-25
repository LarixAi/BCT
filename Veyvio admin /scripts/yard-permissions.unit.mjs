/**
 * Unit checks for yard permission projection — mirrors yard-permissions.ts.
 */
import assert from 'node:assert/strict'

const YARD_MANAGER = [
  'vehicle.view',
  'vehicle.move',
  'vehicle.mark_vor',
  'vehicle.release_vor',
  'check.complete',
  'check.spot_audit',
  'check.override',
  'defect.resolve',
  'equipment.assign',
  'equipment.transfer',
  'task.assign',
  'handover.complete',
  'incident.create',
  'audit.view',
  'plan.view',
  'plan.acknowledge',
]

const YARD_OPERATIVE = [
  'vehicle.view',
  'vehicle.move',
  'check.complete',
  'equipment.assign',
  'equipment.transfer',
  'handover.complete',
  'plan.view',
]

const READ_ONLY = ['vehicle.view', 'audit.view', 'plan.view']

function yardPermissionsForRole(roleKey) {
  const map = {
    yard_operative: YARD_OPERATIVE,
    yard_manager: YARD_MANAGER,
    contractor: YARD_OPERATIVE,
    read_only_auditor: READ_ONLY,
    transport_manager: YARD_MANAGER,
  }
  const direct = map[roleKey]
  if (direct) return [...direct]
  if (['company_owner', 'company_administrator', 'dispatcher'].includes(roleKey)) return [...YARD_MANAGER]
  return [...READ_ONLY]
}

assert.deepEqual(yardPermissionsForRole('yard_manager'), YARD_MANAGER)
assert.ok(yardPermissionsForRole('yard_operative').includes('vehicle.move'))
assert.ok(!yardPermissionsForRole('yard_operative').includes('vehicle.mark_vor'))
assert.deepEqual(yardPermissionsForRole('read_only_auditor'), READ_ONLY)
assert.ok(yardPermissionsForRole('transport_manager').includes('task.assign'))

function yardPermissionForMutationType(type) {
  const map = {
    'vehicle.move': 'vehicle.move',
    'task.create': 'task.assign',
    'vehicle.mark_vor': 'vehicle.mark_vor',
    'inspection.approve': 'check.override',
  }
  return map[type] ?? null
}

function yardPermissionDenied(roleKey, permission) {
  return !yardPermissionsForRole(roleKey).includes(permission)
}

assert.equal(yardPermissionForMutationType('vehicle.move'), 'vehicle.move')
assert.equal(yardPermissionDenied('read_only_auditor', 'vehicle.move'), true)
assert.equal(yardPermissionDenied('yard_manager', 'vehicle.move'), false)
assert.equal(yardPermissionDenied('yard_operative', 'vehicle.mark_vor'), true)

console.log('yard-permissions.unit: ok')
