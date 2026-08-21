/**
 * Server-enforced duty lifecycle transitions (Blueprint F-08 / TD-005).
 * Gate 1 minimum: published → acknowledged (when required) → signed on → signed off.
 */
type Row = Record<string, unknown>

export type DutyLifecycleTransition = 'acknowledge' | 'sign_on' | 'sign_off'

export type DutyTransitionResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

function isTruthy(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

export function evaluateDutyLifecycleTransition(
  duty: Row,
  transition: DutyLifecycleTransition,
  options: { acknowledged?: boolean } = {},
): DutyTransitionResult {
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

export function dutyTransitionHttpStatus(code: string): number {
  if (code === 'forbidden') return 403
  if (code === 'not_signed_on' || code === 'not_published' || code === 'acknowledgement_required') {
    return 409
  }
  if (code === 'duty_completed') return 409
  return 409
}
