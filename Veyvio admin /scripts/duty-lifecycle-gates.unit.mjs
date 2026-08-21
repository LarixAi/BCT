/**
 * Unit checks for duty lifecycle transitions — mirrors duty-lifecycle-gates.ts.
 */
import assert from 'node:assert/strict'

function isTruthy(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function evaluateDutyLifecycleTransition(duty, transition, options = {}) {
  const publicationStatus = String(duty.publication_status ?? '')
  const signedOn = Boolean(duty.actual_sign_on_at)
  const signedOff = Boolean(duty.actual_sign_off_at)
  const acknowledgementRequired = duty.acknowledgement_required !== false
  const lifecycle = String(duty.driver_lifecycle_status ?? '')

  if (transition === 'acknowledge') {
    if (publicationStatus !== 'published') {
      return { ok: false, code: 'not_published', message: 'Only published duties can be acknowledged' }
    }
    if (signedOff || lifecycle === 'completed') {
      return { ok: false, code: 'duty_completed', message: 'Duty is already completed' }
    }
    return { ok: true }
  }

  if (transition === 'sign_on') {
    if (publicationStatus !== 'published') {
      return { ok: false, code: 'not_published', message: 'Only published duties can be signed on' }
    }
    if (signedOff || lifecycle === 'completed') {
      return {
        ok: false,
        code: 'duty_completed',
        message: 'Duty is already signed off — cannot sign on again',
      }
    }
    if (signedOn) return { ok: true }
    // Lifecycle already past acknowledgement counts even when the ack row's
    // revision lags duties.version (global version bump on the ack UPDATE).
    const lifecycleAcknowledged = lifecycle === 'acknowledged' || lifecycle === 'in_progress'
    if (acknowledgementRequired && !isTruthy(options.acknowledged) && !lifecycleAcknowledged) {
      return {
        ok: false,
        code: 'acknowledgement_required',
        message: 'Acknowledge this duty before signing on',
      }
    }
    return { ok: true }
  }

  if (transition === 'sign_off') {
    if (!signedOn) {
      return { ok: false, code: 'not_signed_on', message: 'Sign on before signing off' }
    }
    if (signedOff) return { ok: true }
    return { ok: true }
  }

  return { ok: false, code: 'invalid_transition', message: 'Unsupported duty transition' }
}

const publishedDuty = {
  publication_status: 'published',
  acknowledgement_required: true,
  driver_lifecycle_status: 'published',
}

assert.deepEqual(evaluateDutyLifecycleTransition(publishedDuty, 'sign_on'), {
  ok: false,
  code: 'acknowledgement_required',
  message: 'Acknowledge this duty before signing on',
})

assert.deepEqual(
  evaluateDutyLifecycleTransition(publishedDuty, 'sign_on', { acknowledged: true }),
  { ok: true },
)

assert.deepEqual(
  evaluateDutyLifecycleTransition(
    { ...publishedDuty, actual_sign_on_at: '2026-07-24T08:00:00.000Z' },
    'sign_off',
  ),
  { ok: true },
)

assert.deepEqual(evaluateDutyLifecycleTransition(publishedDuty, 'sign_off'), {
  ok: false,
  code: 'not_signed_on',
  message: 'Sign on before signing off',
})

assert.deepEqual(
  evaluateDutyLifecycleTransition(
    {
      ...publishedDuty,
      actual_sign_on_at: '2026-07-24T08:00:00.000Z',
      actual_sign_off_at: '2026-07-24T16:00:00.000Z',
    },
    'sign_on',
    { acknowledged: true },
  ),
  {
    ok: false,
    code: 'duty_completed',
    message: 'Duty is already signed off — cannot sign on again',
  },
)

assert.deepEqual(
  evaluateDutyLifecycleTransition(
    { publication_status: 'draft', acknowledgement_required: true },
    'acknowledge',
  ),
  {
    ok: false,
    code: 'not_published',
    message: 'Only published duties can be acknowledged',
  },
)

assert.deepEqual(
  evaluateDutyLifecycleTransition(
    {
      ...publishedDuty,
      driver_lifecycle_status: 'acknowledged',
    },
    'sign_on',
  ),
  { ok: true },
)

assert.deepEqual(
  evaluateDutyLifecycleTransition(
    {
      publication_status: 'published',
      acknowledgement_required: false,
      driver_lifecycle_status: 'published',
    },
    'sign_on',
  ),
  { ok: true },
)

console.log('duty-lifecycle-gates.unit: ok')
