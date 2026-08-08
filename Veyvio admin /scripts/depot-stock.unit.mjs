/**
 * Depot stock + fuel card mapping (F-03 / TD-027).
 * Run: npx tsx scripts/depot-stock.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  mapDepotStockRow,
  mapFuelCardRow,
  mapStockTransferRow,
  normalizeFuelCardStatus,
  normalizeStockCategory,
  stockStatusFromLevels,
  mapDepotStockToYardLine,
  mapConsumableLevelToYard,
  mergeConsumablesIntoEquipmentMap,
} from '../supabase/functions/_shared/depot-stock.mapping.ts'

assert.equal(normalizeStockCategory('gloves'), 'consumable')
assert.equal(normalizeStockCategory('cleaning'), 'cleaning')
assert.equal(normalizeFuelCardStatus('ACTIVE'), 'active')
assert.equal(stockStatusFromLevels(0, 10), 'out')
assert.equal(stockStatusFromLevels(5, 10), 'reorder')
assert.equal(stockStatusFromLevels(10, 10), 'low')
assert.equal(stockStatusFromLevels(50, 10), 'normal')

const stock = mapDepotStockRow(
  {
    id: 's1',
    depot_id: 'd1',
    resource_item_id: 'gloves',
    resource_name: 'Disposable gloves',
    category: 'consumable',
    available: 12,
    reserved: 0,
    minimum: 20,
    unit: 'pairs',
  },
  'Main',
)
assert.equal(stock.status, 'low')
assert.equal(stock.depotName, 'Main')

const card = mapFuelCardRow({
  id: 'c1',
  provider: 'Allstar',
  masked_number: '****1234',
  status: 'active',
  assignment_model: 'vehicle',
  assigned_vehicle_id: 'v1',
  assigned_driver_name: null,
  daily_limit: 200,
  last_transaction_at: null,
}, { registrationNumber: 'BX21 ABC' })
assert.equal(card.assignedRegistration, 'BX21 ABC')

const transfer = mapStockTransferRow(
  {
    id: 't1',
    resource_item_id: 'gloves',
    resource_name: 'Gloves',
    quantity: 5,
    unit: 'pairs',
    from_depot_id: 'd1',
    to_depot_id: 'd2',
    status: 'received',
    requested_by: 'Ops',
    created_at: '2026-08-08T10:00:00.000Z',
  },
  { fromDepotName: 'A', toDepotName: 'B' },
)
assert.equal(transfer.fromDepotName, 'A')

const yardLine = mapDepotStockToYardLine({
  resource_item_id: 'wipes',
  resource_name: 'Wipes',
  available: 8,
  unit: 'packs',
})
assert.equal(yardLine.onHand, 8)

const consumable = mapConsumableLevelToYard({
  def_id: 'wipes',
  label: 'Wipes',
  current_qty: 3,
  target_qty: 10,
  unit: 'packs',
})
assert.equal(consumable.current, 3)

const merged = mergeConsumablesIntoEquipmentMap(
  { veh_1: { fixed: [], assigned: [], consumables: [], documents: [] } },
  [{ vehicle_id: 'veh_1', def_id: 'wipes', label: 'Wipes', current_qty: 3, target_qty: 10, unit: 'packs' }],
)
assert.equal(merged.veh_1.consumables.length, 1)

console.log('depot-stock.unit.mjs: PASS')
