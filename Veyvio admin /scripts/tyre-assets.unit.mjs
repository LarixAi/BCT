/**
 * Durable tyre asset mapping (F-03 / TD-027).
 * Run: npx tsx scripts/tyre-assets.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  isUuid,
  mapTyreAssetRow,
  normalizeTyreStatus,
  tyreNeedsAttentionMapped,
} from '../supabase/functions/_shared/tyre-assets.mapping.ts'

assert.equal(normalizeTyreStatus('FITTED'), 'fitted')
assert.equal(normalizeTyreStatus('unknown'), 'in_stock')
assert.equal(isUuid('not-a-uuid'), false)
assert.equal(isUuid('a1b2c3d4-e5f6-4789-a012-3456789abcde'), true)

const row = {
  id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  internal_id: 'TY-014',
  brand: 'Michelin',
  size: '225/75R16',
  dot_code: '1224',
  status: 'fitted',
  tread_depth_mm: 1.5,
  pressure_psi: 65,
  vehicle_id: 'veh-1',
  position: 'OSF',
  position_label: 'Offside front',
  depot_id: 'dep-1',
  fitted_at: '2026-08-01T09:00:00.000Z',
  removed_at: null,
  retorque_due_at: '2026-08-02T09:00:00.000Z',
  recommendation: null,
  linked_defect_id: null,
  linked_inspection_id: null,
  unit_cost: 120,
}

const mapped = mapTyreAssetRow(row, {
  registrationNumber: 'BX21 ABC',
  depotName: 'Main',
})
assert.equal(mapped.internalId, 'TY-014')
assert.equal(mapped.registrationNumber, 'BX21 ABC')
assert.equal(mapped.status, 'fitted')
assert.equal(tyreNeedsAttentionMapped(mapped, 2), true)

const healthy = mapTyreAssetRow({
  ...row,
  status: 'in_stock',
  vehicle_id: null,
  tread_depth_mm: 6,
  retorque_due_at: null,
  position: null,
})
assert.equal(tyreNeedsAttentionMapped(healthy, 2), false)

console.log('tyre-assets.unit.mjs: PASS')
