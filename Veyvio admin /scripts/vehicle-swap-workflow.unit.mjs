/**
 * Vehicle swap workflow mapping checks.
 * Imports the real pure mapping module — a regression that broke mapSwapRow
 * would fail this test, unlike a copy of the logic.
 * Run: npx tsx scripts/vehicle-swap-workflow.unit.mjs
 */
import assert from 'node:assert/strict'
import { mapSwapRow } from '../supabase/functions/_shared/vehicle-swap-workflow.mapping.ts'

const row = mapSwapRow({
  id: 'swap-1',
  duty_id: 'duty-1',
  driver_id: 'drv-1',
  current_vehicle_id: 'veh-a',
  requested_vehicle_id: 'veh-b',
  reason: 'Defect on duty vehicle',
  status: 'pending',
  requested_at: '2026-07-25T12:00:00.000Z',
})

assert.equal(row.id, 'swap-1')
assert.equal(row.currentVehicleId, 'veh-a')
assert.equal(row.requestedVehicleId, 'veh-b')
assert.equal(row.status, 'pending')
assert.equal(row.resolvedAt, null)

console.log('vehicle-swap-workflow.unit.mjs: PASS')
