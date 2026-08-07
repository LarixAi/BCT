/**
 * Gate 2 unit checks — journey gates, override reason, defect automation, support grant.
 * Run: node scripts/gate2-shared.unit.mjs
 */
import assert from 'node:assert/strict'

// Deno-style modules can't import into Node directly — duplicate pure logic checks here
// mirroring journey-lifecycle-gates / override-audit / defect-automation / support-access.

const JOURNEY_TRANSITIONS = {
  scheduled: ['released', 'cancelled'],
  released: ['ready', 'cancelled'],
  ready: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'aborted', 'transferred', 'partially_completed', 'cancelled'],
  completed: [],
  cancelled: [],
  aborted: [],
  transferred: ['completed', 'cancelled'],
  partially_completed: ['completed', 'cancelled'],
}

function evaluateJourneyTransition(currentRaw, transition) {
  const from = String(currentRaw ?? 'scheduled')
  if (transition === 'start') {
    if (from === 'in_progress') return { ok: true, from, to: 'in_progress' }
    if (['completed', 'cancelled', 'aborted'].includes(from)) {
      return { ok: false, code: 'journey_closed', message: `Journey is already ${from}` }
    }
    if (['scheduled', 'released', 'ready'].includes(from)) {
      return { ok: true, from, to: 'in_progress' }
    }
  }
  if (transition === 'complete') {
    if (from === 'completed') return { ok: true, from, to: 'completed' }
    if (!['in_progress', 'partially_completed', 'transferred'].includes(from)) {
      return { ok: false, code: 'not_in_progress', message: 'Start the journey before completing it' }
    }
    return { ok: true, from, to: 'completed' }
  }
  return { ok: false, code: 'invalid_transition', message: 'unsupported' }
}

function requireOverrideReason(blockers, overrideReason) {
  if (!blockers.length) return { ok: true, reason: '' }
  const reason = String(overrideReason ?? '').trim()
  if (!reason) return { ok: false, message: blockers[0] }
  return { ok: true, reason }
}

function rulesTriggeredByDefect(input) {
  const severity = String(input.severity ?? '').toLowerCase()
  const component = String(input.component ?? '').toLowerCase()
  const out = []
  if (['dangerous', 'critical', 'safety_critical'].includes(severity)) out.push('rule-critical-check')
  if (component.includes('wheelchair') || component.includes('ramp')) out.push('rule-accessibility')
  return out
}

function isSupportGrantActive(grant) {
  if (!grant) return false
  if (grant.revokedAt) return false
  if (!grant.expiresAt) return false
  return new Date(grant.expiresAt).getTime() > Date.now()
}

// Journey
assert.equal(evaluateJourneyTransition('scheduled', 'start').ok, true)
assert.equal(evaluateJourneyTransition('scheduled', 'start').to, 'in_progress')
assert.equal(evaluateJourneyTransition('scheduled', 'complete').ok, false)
assert.equal(evaluateJourneyTransition('in_progress', 'complete').ok, true)
assert.equal(evaluateJourneyTransition('completed', 'start').ok, false)
assert.ok(JOURNEY_TRANSITIONS.in_progress.includes('completed'))

// Override
assert.equal(requireOverrideReason(['VOR'], '').ok, false)
assert.equal(requireOverrideReason(['VOR'], 'Ops approved temporary').ok, true)
assert.equal(requireOverrideReason([], '').ok, true)

// Defect automation
assert.deepEqual(rulesTriggeredByDefect({ severity: 'critical' }), ['rule-critical-check'])
assert.ok(rulesTriggeredByDefect({ component: 'wheelchair lift' }).includes('rule-accessibility'))

// Support grant
assert.equal(isSupportGrantActive({ expiresAt: new Date(Date.now() + 60_000).toISOString() }), true)
assert.equal(isSupportGrantActive({ expiresAt: new Date(Date.now() - 60_000).toISOString() }), false)
assert.equal(isSupportGrantActive({ expiresAt: new Date(Date.now() + 60_000).toISOString(), revokedAt: new Date().toISOString() }), false)

// Vehicle document expiry (mirrors projections.vehicleDocumentExpiryFailures)
function documentStatusFromExpiry(expiryIso) {
  if (!expiryIso) return 'unknown'
  const expiry = new Date(expiryIso)
  if (Number.isNaN(expiry.getTime())) return 'unknown'
  if (expiry.getTime() < Date.now()) return 'expired'
  return 'valid'
}
assert.equal(documentStatusFromExpiry('2000-01-01'), 'expired')
assert.equal(documentStatusFromExpiry('2099-01-01'), 'valid')
assert.equal(documentStatusFromExpiry(null), 'unknown')

console.log('gate2-shared.unit: ok')
