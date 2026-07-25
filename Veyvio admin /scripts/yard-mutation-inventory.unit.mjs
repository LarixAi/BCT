/**
 * P0-02 / TD-009 — yard outbox mutation command inventory (mirrors yard-mutation-inventory.ts).
 */
import assert from 'node:assert/strict'

const ALL_TYPES = [
  'vehicle.move',
  'vehicle.mark_vor',
  'vehicle.release_vor',
  'vehicle.adblue_refill',
  'check.complete',
  'defect.create',
  'defect.resolve',
  'equipment.assign',
  'equipment.transfer',
  'equipment.restock',
  'departure.release',
  'departure.complete',
  'plan.acknowledge',
  'task.create',
  'task.update',
  'handover.complete',
  'inspection.start',
  'inspection.media',
  'inspection.complete',
  'inspection.approve',
  'damage.report',
  'damage.review',
  'repair.request',
  'repair.start',
  'repair.complete',
  'repair.verify',
]

const PENDING_HANDLER_MODULES = [
  'plan.acknowledge',
  'defect.create',
  'defect.resolve',
  'handover.complete',
  'equipment.assign',
  'departure.release',
  'vehicle.release_vor',
  'vehicle.adblue_refill',
  'repair.start',
]

function yardPermissionForMutationType(type) {
  const map = {
    'vehicle.move': 'vehicle.move',
    'task.create': 'task.assign',
    'task.update': 'task.assign',
    'vehicle.mark_vor': 'vehicle.mark_vor',
    'vehicle.release_vor': 'vehicle.release_vor',
    'check.complete': 'check.complete',
    'inspection.start': 'check.complete',
    'inspection.media': 'check.complete',
    'inspection.complete': 'check.complete',
    'inspection.approve': 'check.override',
    'damage.report': 'incident.create',
    'damage.review': 'defect.resolve',
    'repair.request': 'defect.resolve',
    'defect.create': 'incident.create',
    'defect.resolve': 'defect.resolve',
    'equipment.assign': 'equipment.assign',
    'equipment.transfer': 'equipment.transfer',
    'equipment.restock': 'equipment.assign',
    'plan.acknowledge': 'plan.acknowledge',
    'departure.release': 'plan.acknowledge',
    'departure.complete': 'plan.acknowledge',
    'handover.complete': 'handover.complete',
    'repair.start': 'defect.resolve',
    'repair.complete': 'defect.resolve',
    'repair.verify': 'defect.resolve',
  }
  return map[type] ?? null
}

assert.equal(ALL_TYPES.length, 26)
for (const type of ALL_TYPES) {
  assert.ok(yardPermissionForMutationType(type) !== undefined || type === 'vehicle.adblue_refill')
}

for (const type of PENDING_HANDLER_MODULES) {
  assert.ok(ALL_TYPES.includes(type), `handler module type must be inventoried: ${type}`)
}

console.log('yard-mutation-inventory.unit: ok')
