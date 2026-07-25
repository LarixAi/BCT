/**
 * Unit checks for dispatch assignment eligibility finalization (no network).
 * Mirrors dispatch-assignment-gates.ts — keep in sync when gate logic changes.
 */
import assert from 'node:assert/strict'

function messageFromFailure(failure) {
  return String(failure.message ?? failure.code ?? 'Not eligible')
}

function finalizeEligibilityResult(blockers, warnings) {
  const uniqueBlockers = [...new Set(blockers.filter(Boolean))]
  const uniqueWarnings = [...new Set(warnings.filter(Boolean))]
  if (uniqueBlockers.length) {
    return { status: 'blocked', blockers: uniqueBlockers, warnings: uniqueWarnings }
  }
  if (uniqueWarnings.length) {
    return { status: 'eligible_with_warnings', blockers: uniqueBlockers, warnings: uniqueWarnings }
  }
  return { status: 'eligible', blockers: uniqueBlockers, warnings: uniqueWarnings }
}

function classifyEligibilityFailures(failures) {
  const blockers = []
  const warnings = []
  for (const failure of failures) {
    const message = messageFromFailure(failure)
    if (String(failure.severity) === 'block') blockers.push(message)
    else warnings.push(message)
  }
  return finalizeEligibilityResult(blockers, warnings)
}

assert.equal(messageFromFailure({ code: 'LICENCE_EXPIRED' }), 'LICENCE_EXPIRED')
assert.equal(messageFromFailure({ message: 'PCV expired' }), 'PCV expired')

assert.deepEqual(finalizeEligibilityResult([], []), {
  status: 'eligible',
  blockers: [],
  warnings: [],
})

assert.deepEqual(finalizeEligibilityResult(['VOR'], ['No vehicle assigned yet.']), {
  status: 'blocked',
  blockers: ['VOR'],
  warnings: ['No vehicle assigned yet.'],
})

assert.deepEqual(finalizeEligibilityResult([], ['No vehicle assigned yet.']), {
  status: 'eligible_with_warnings',
  blockers: [],
  warnings: ['No vehicle assigned yet.'],
})

assert.deepEqual(
  finalizeEligibilityResult(['VOR', 'VOR', ''], ['warn', 'warn']),
  {
    status: 'blocked',
    blockers: ['VOR'],
    warnings: ['warn'],
  },
)

assert.deepEqual(
  classifyEligibilityFailures([
    { severity: 'block', message: 'PCV expired' },
    { severity: 'warn', code: 'TRAINING_DUE' },
  ]),
  {
    status: 'blocked',
    blockers: ['PCV expired'],
    warnings: ['TRAINING_DUE'],
  },
)

console.log('dispatch-assignment-gates.unit: ok')
