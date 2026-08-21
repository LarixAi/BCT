/**
 * Durable equipment asset mapping (F-03 / TD-027).
 * Run: npx tsx scripts/equipment-assets.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  isUuid,
  mapEquipmentAssetRow,
  mapEquipmentToVehicleItem,
  mapEquipmentToYardAssigned,
  normalizeEquipmentCategory,
  normalizeEquipmentStatus,
  buildEquipmentByVehicleMap,
} from '../supabase/functions/_shared/equipment-assets.mapping.ts'

assert.equal(normalizeEquipmentCategory('safety'), 'safety_equipment')
assert.equal(normalizeEquipmentCategory('accessibility_equipment'), 'accessibility_equipment')
assert.equal(normalizeEquipmentStatus('damaged'), 'unserviceable')
assert.equal(normalizeEquipmentStatus('assigned'), 'assigned')
assert.equal(isUuid('not-a-uuid'), false)
assert.equal(isUuid('a1b2c3d4-e5f6-4789-a012-3456789abcde'), true)

const row = {
  id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  name: 'Wheelchair Strap',
  category: 'accessibility_equipment',
  status: 'assigned',
  vehicle_id: 'veh-1',
  depot_id: 'dep-1',
  qr_code: 'WCS-014',
  serial_number: 'SN-1',
  required_for_duty: true,
  expiry_at: '2027-01-01',
  last_verified_at: '2026-08-01T10:00:00.000Z',
  assigned_at: '2026-08-01T09:00:00.000Z',
  assigned_by_name: 'Yard lead',
  serviceable: true,
  in_date: true,
}

const fleet = mapEquipmentAssetRow(row, {
  registrationNumber: 'BX21 ABC',
  depotName: 'Main',
})
assert.equal(fleet.vehicleId, 'veh-1')
assert.equal(fleet.registrationNumber, 'BX21 ABC')
assert.equal(fleet.requiredForDuty, true)

const vehicleItem = mapEquipmentToVehicleItem(row)
assert.equal(vehicleItem.category, 'removable')
assert.equal(vehicleItem.assigned, true)
assert.equal(vehicleItem.qrCode, 'WCS-014')

const yardItem = mapEquipmentToYardAssigned(row)
assert.equal(yardItem.label, 'Wheelchair Strap')
assert.equal(yardItem.status, 'present')

const byVehicle = buildEquipmentByVehicleMap([
  row,
  {
    ...row,
    id: 'b2c3d4e5-f6a7-4890-b123-456789abcdef',
    category: 'safety_equipment',
    name: 'Fire Extinguisher',
    vehicle_id: 'veh-1',
  },
  {
    ...row,
    id: 'c3d4e5f6-a7b8-4901-c234-56789abcdef0',
    vehicle_id: null,
    status: 'available',
  },
])

assert.equal(Object.keys(byVehicle).length, 1)
assert.equal(byVehicle['veh-1'].assigned.length, 1)
assert.equal(byVehicle['veh-1'].fixed.length, 1)

console.log('equipment-assets.unit.mjs: PASS')
