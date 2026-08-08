/**
 * Operational exception case transitions (F-18).
 * Run: npx tsx scripts/operational-exceptions.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  canTransitionExceptionStatus,
  isTerminalExceptionStatus,
  mapExceptionCase,
  normalizeExceptionStatus,
} from '../supabase/functions/_shared/operational-exceptions.mapping.ts'

assert.equal(normalizeExceptionStatus('open'), 'new')
assert.equal(canTransitionExceptionStatus('new', 'acknowledged'), true)
assert.equal(canTransitionExceptionStatus('acknowledged', 'assigned'), true)
assert.equal(canTransitionExceptionStatus('resolved', 'assigned'), false)
assert.equal(canTransitionExceptionStatus('resolved', 'reopened'), true)
assert.equal(isTerminalExceptionStatus('resolved'), true)
assert.equal(isTerminalExceptionStatus('new'), false)

const mapped = mapExceptionCase(
  {
    id: 'exc-1',
    title: 'Driver late',
    status: 'open',
    severity: 'high',
    category: 'driver',
    type_code: 'driver_late',
    description: 'Late for sign-on',
    detected_at: '2026-08-08T09:00:00.000Z',
    updated_at: '2026-08-08T09:05:00.000Z',
    escalated: false,
    owner_id: null,
    related_record: 'DRV-1',
    related_href: '/drivers/1',
  },
  [
    {
      id: 'ev-1',
      event_type: 'raised',
      actor_name: 'Ops',
      body: 'Raised',
      created_at: '2026-08-08T09:00:00.000Z',
    },
  ],
  null,
)

assert.equal(mapped.status, 'new')
assert.equal(mapped.durableCase, true)
assert.equal(mapped.source, 'Command')
assert.equal(mapped.timeline.length, 1)

console.log('operational-exceptions.unit.mjs: PASS')
