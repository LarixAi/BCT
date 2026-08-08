/**
 * Journey-sequence reorder pure helpers.
 * Run: npx tsx scripts/journey-sequence-reorder.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  canReorderTripStatus,
  extractPassengerIdFromJobId,
  extractTripIdFromJobId,
  parseDutyTripSyntheticId,
  planPassengerReorder,
  planRunTripReorder,
} from '../supabase/functions/_shared/journey-sequence-reorder.mapping.ts'

const tripA = '11111111-1111-4111-8111-111111111111'
const tripB = '22222222-2222-4222-8222-222222222222'
const dutyId = '33333333-3333-4333-8333-333333333333'
const paxA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const paxB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

assert.equal(parseDutyTripSyntheticId(`duty-trip-${dutyId}`), dutyId)
assert.equal(extractTripIdFromJobId(`${tripA}-pax-${paxA}`), tripA)
assert.equal(extractTripIdFromJobId(`duty-stop-${dutyId}-stop-pickup-${tripB}`), tripB)
assert.equal(extractPassengerIdFromJobId(`${tripA}-pax-${paxA}`), paxA)
assert.equal(canReorderTripStatus('assigned'), true)
assert.equal(canReorderTripStatus('completed'), false)

const runPlan = planRunTripReorder({
  currentTripIdsInSequence: [tripA, tripB],
  orderedPickupJobIds: [
    `duty-stop-${dutyId}-stop-pickup-${tripB}`,
    `duty-stop-${dutyId}-stop-pickup-${tripA}`,
  ],
})
assert.deepEqual(runPlan.orderedTripIds, [tripB, tripA])
assert.equal(runPlan.changed, true)

const paxPlan = planPassengerReorder({
  currentPassengerIds: [paxA, paxB],
  orderedPickupJobIds: [`${tripA}-pax-${paxB}`, `${tripA}-pax-${paxA}`],
})
assert.deepEqual(paxPlan.orderedPassengerIds, [paxB, paxA])
assert.equal(paxPlan.changed, true)

assert.throws(() =>
  planRunTripReorder({
    currentTripIdsInSequence: [tripA, tripB],
    orderedPickupJobIds: [`duty-stop-${dutyId}-stop-pickup-${tripA}`],
  }),
)

console.log('journey-sequence-reorder.unit.mjs: PASS')
