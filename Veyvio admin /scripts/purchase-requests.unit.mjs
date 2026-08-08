/**
 * Durable purchase request mapping (F-03 / TD-027).
 * Run: npx tsx scripts/purchase-requests.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  canApprovePurchaseRequest,
  isUuid,
  mapPurchaseRequestRow,
  normalizePurchaseStatus,
  normalizePurchaseUrgency,
} from '../supabase/functions/_shared/purchase-requests.mapping.ts'

assert.equal(normalizePurchaseUrgency('URGENT'), 'urgent')
assert.equal(normalizePurchaseUrgency('nope'), 'routine')
assert.equal(normalizePurchaseStatus('Approved'), 'approved')
assert.equal(isUuid('not-a-uuid'), false)

const mapped = mapPurchaseRequestRow(
  {
    id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    resource_name: 'Fire extinguisher',
    quantity: 2,
    unit: 'each',
    estimated_cost: 48.5,
    vehicle_id: 'veh-1',
    reason: 'Expiry replacement',
    urgency: 'urgent',
    status: 'pending',
    requested_by_name: 'Sam Yard',
    requested_by_user_id: 'user-1',
    needed_by: '2026-08-15',
    created_at: '2026-08-08T10:00:00.000Z',
  },
  { registrationNumber: 'BX21 ABC', depotName: 'Main' },
)
assert.equal(mapped.resourceName, 'Fire extinguisher')
assert.equal(mapped.registrationNumber, 'BX21 ABC')
assert.equal(mapped.status, 'pending')

assert.equal(
  canApprovePurchaseRequest({
    status: 'pending',
    requestedByUserId: 'user-1',
    requestedByName: 'Sam Yard',
    actorUserId: 'user-1',
    actorName: 'Sam Yard',
  }).ok,
  false,
)

assert.equal(
  canApprovePurchaseRequest({
    status: 'pending',
    requestedByUserId: 'user-1',
    requestedByName: 'Sam Yard',
    actorUserId: 'user-2',
    actorName: 'Alex Approver',
  }).ok,
  true,
)

assert.equal(
  canApprovePurchaseRequest({
    status: 'approved',
    requestedByUserId: 'user-1',
    requestedByName: 'Sam Yard',
    actorUserId: 'user-2',
    actorName: 'Alex Approver',
  }).ok,
  false,
)

console.log('purchase-requests.unit.mjs: PASS')
