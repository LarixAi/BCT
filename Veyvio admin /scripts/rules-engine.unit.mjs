/**
 * Unit checks for F-05 rules-engine composition (finalize helper).
 */
import assert from 'node:assert/strict'

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

assert.equal(finalizeEligibilityResult(['VOR'], []).status, 'blocked')
assert.equal(finalizeEligibilityResult([], ['check due']).status, 'eligible_with_warnings')
assert.equal(finalizeEligibilityResult([], []).status, 'eligible')
assert.deepEqual(finalizeEligibilityResult(['a', 'a', ''], ['w']).blockers, ['a'])

console.log('rules-engine.unit: ok')
