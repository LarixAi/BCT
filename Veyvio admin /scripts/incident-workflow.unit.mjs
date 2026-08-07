/**
 * P0-07 — incident acknowledgement / escalation pure logic checks.
 * Imports the real pure mapping module — a regression in
 * mapIncidentRegisterRow or validateEscalation would fail this test, unlike
 * a copy of the logic.
 * Run: npx tsx scripts/incident-workflow.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  mapIncidentRegisterRow,
  validateEscalation,
} from '../supabase/functions/_shared/incident-workflow.mapping.ts'

// unacknowledged high severity is overdue
const openHigh = mapIncidentRegisterRow({
  id: '1',
  incident_reference: 'INC-001',
  incident_type: 'collision',
  severity: 'high',
  status: 'open',
  metadata: {},
})
assert.equal(openHigh.isAcknowledged, false)
assert.equal(openHigh.isOverdue, true)

// acknowledged critical is not overdue
const ackCritical = mapIncidentRegisterRow({
  id: '2',
  incident_reference: 'INC-002',
  incident_type: 'safeguarding',
  severity: 'critical',
  status: 'under_investigation',
  metadata: { acknowledgedAt: '2026-07-25T10:00:00.000Z' },
})
assert.equal(ackCritical.isSafeguarding, true)
assert.equal(ackCritical.isAcknowledged, true)
assert.equal(ackCritical.isOverdue, false)

// escalation cannot downgrade
const blocked = validateEscalation('critical', 'medium')
assert.equal(blocked.ok, false)

const allowed = validateEscalation('medium', 'high')
assert.equal(allowed.ok, true)

console.log('incident-workflow.unit.mjs: all checks passed')
