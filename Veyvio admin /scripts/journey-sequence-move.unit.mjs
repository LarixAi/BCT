/**
 * Journey-sequence move pure helpers.
 * Run: npx tsx scripts/journey-sequence-move.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  evaluateJourneyMovePlan,
  nextRunSequences,
  uniqueTripIdsFromJobIds,
} from '../supabase/functions/_shared/journey-sequence-move.mapping.ts'

const tripA = '11111111-1111-4111-8111-111111111111'
const tripB = '22222222-2222-4222-8222-222222222222'
const dutyId = '33333333-3333-4333-8333-333333333333'
const runA = '44444444-4444-4444-8444-444444444444'
const runB = '55555555-5555-4555-8555-555555555555'

assert.deepEqual(
  uniqueTripIdsFromJobIds([
    `duty-stop-${dutyId}-stop-pickup-${tripA}`,
    `duty-stop-${dutyId}-stop-pickup-${tripB}`,
    `duty-stop-${dutyId}-stop-pickup-${tripA}`,
  ]),
  [tripA, tripB],
)

assert.deepEqual(nextRunSequences([1, 2], 2), [3, 4])

const blocked = evaluateJourneyMovePlan({
  action: 'move_to_run',
  sourceTripIds: [tripA],
  sourceRunId: runA,
  destinationRunId: runA,
  destinationSameAsSource: true,
})
assert.equal(blocked.blocked, true)

const ok = evaluateJourneyMovePlan({
  action: 'move_to_run',
  sourceTripIds: [tripA],
  sourceRunId: runA,
  destinationRunId: runB,
})
assert.equal(ok.blocked, false)

const create = evaluateJourneyMovePlan({
  action: 'create_new_run',
  sourceTripIds: [tripA],
  sourceRunId: runA,
  destinationRunId: null,
})
assert.equal(create.blocked, false)
assert.ok(create.checks.some((c) => c.code === 'new_run'))

console.log('journey-sequence-move.unit.mjs: PASS')
