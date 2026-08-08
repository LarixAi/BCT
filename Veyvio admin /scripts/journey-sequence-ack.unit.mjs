/**
 * Journey-sequence acknowledgement state machine.
 * Run: npx tsx scripts/journey-sequence-ack.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  canAdvanceJourneyAck,
  isTerminalJourneyAck,
  mapJourneyAckRow,
} from '../supabase/functions/_shared/journey-sequence-ack.mapping.ts'

assert.equal(canAdvanceJourneyAck('sent', 'viewed'), true)
assert.equal(canAdvanceJourneyAck('viewed', 'acknowledged'), true)
assert.equal(canAdvanceJourneyAck('acknowledged', 'declined'), false)
assert.equal(canAdvanceJourneyAck('declined', 'viewed'), false)
assert.equal(isTerminalJourneyAck('acknowledged'), true)
assert.equal(isTerminalJourneyAck('sent'), false)

const mapped = mapJourneyAckRow({
  id: 'ack-1',
  trip_key: 'duty-trip-1',
  status: 'sent',
  summary: 'Stop order changed',
  escalate_after_minutes: 10,
  sent_at: '2026-08-08T09:00:00.000Z',
  delivered_at: '2026-08-08T09:00:00.000Z',
  viewed_at: null,
  acknowledged_at: null,
  declined_at: null,
  decline_reason: null,
})
assert.equal(mapped.tripId, 'duty-trip-1')
assert.equal(mapped.status, 'sent')
assert.equal(mapped.summary, 'Stop order changed')

console.log('journey-sequence-ack.unit.mjs: PASS')
