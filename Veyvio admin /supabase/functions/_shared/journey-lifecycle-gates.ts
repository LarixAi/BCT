/**
 * F-08 / TD-005 — server journey lifecycle gates (Duty → Journey on `runs`).
 * Canonical: scheduled → released → ready → in_progress → completed
 * (+ cancelled, aborted, transferred, partially_completed)
 */
export type JourneyLifecycleStatus =
  | 'scheduled'
  | 'released'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'aborted'
  | 'transferred'
  | 'partially_completed'

export type JourneyTransition = 'release' | 'ready' | 'start' | 'complete' | 'abort' | 'cancel'

export type JourneyTransitionResult =
  | { ok: true; from: JourneyLifecycleStatus; to: JourneyLifecycleStatus }
  | { ok: false; code: string; message: string }

const JOURNEY_TRANSITIONS: Record<JourneyLifecycleStatus, JourneyLifecycleStatus[]> = {
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

export function normalizeJourneyStatus(raw: unknown): JourneyLifecycleStatus {
  const value = String(raw ?? 'scheduled').toLowerCase()
  if (value in JOURNEY_TRANSITIONS) return value as JourneyLifecycleStatus
  // Map legacy run_status values onto the journey machine.
  if (value === 'planned' || value === 'draft') return 'scheduled'
  if (value === 'published' || value === 'allocated') return 'released'
  if (value === 'active' || value === 'started') return 'in_progress'
  if (value === 'done' || value === 'finished') return 'completed'
  return 'scheduled'
}

export function canTransitionJourney(
  from: JourneyLifecycleStatus,
  to: JourneyLifecycleStatus,
): boolean {
  return JOURNEY_TRANSITIONS[from]?.includes(to) ?? false
}

export function evaluateJourneyTransition(
  currentRaw: unknown,
  transition: JourneyTransition,
): JourneyTransitionResult {
  const from = normalizeJourneyStatus(currentRaw)

  const target: JourneyLifecycleStatus =
    transition === 'release'
      ? 'released'
      : transition === 'ready'
        ? 'ready'
        : transition === 'start'
          ? 'in_progress'
          : transition === 'complete'
            ? 'completed'
            : transition === 'abort'
              ? 'aborted'
              : 'cancelled'

  // Allow start from scheduled/released by auto-advancing (pilot convenience).
  if (transition === 'start') {
    if (from === 'in_progress') {
      return { ok: true, from, to: 'in_progress' }
    }
    if (from === 'completed' || from === 'cancelled' || from === 'aborted') {
      return {
        ok: false,
        code: 'journey_closed',
        message: `Journey is already ${from} and cannot be started`,
      }
    }
    if (from === 'scheduled' || from === 'released' || from === 'ready') {
      return { ok: true, from, to: 'in_progress' }
    }
  }

  if (transition === 'complete') {
    if (from === 'completed') return { ok: true, from, to: 'completed' }
    if (from !== 'in_progress' && from !== 'partially_completed' && from !== 'transferred') {
      return {
        ok: false,
        code: 'not_in_progress',
        message: 'Start the journey before completing it',
      }
    }
  }

  if (!canTransitionJourney(from, target) && !(transition === 'start' && target === 'in_progress')) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: `Invalid journey transition: ${from} → ${target}`,
    }
  }

  return { ok: true, from, to: target }
}

export function journeyTransitionHttpStatus(code: string): number {
  if (code === 'forbidden') return 403
  return 409
}

/**
 * Completing a journey must never imply vehicle handback (S2 invariant).
 * Handback is a separate vehicle-use command.
 */
export function journeyCompleteImpliesHandback(): boolean {
  return false
}
