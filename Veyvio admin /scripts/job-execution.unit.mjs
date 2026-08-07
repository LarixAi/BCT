/**
 * Job execution snapshot helpers (F-18 / TD-010).
 * Imports the real module — a regression that broke stopExecutionDone would
 * fail this test, unlike a copy of the logic.
 * Run: npx tsx scripts/job-execution.unit.mjs
 */
import assert from 'node:assert/strict'
import { stopExecutionDone } from '../src/lib/operations/job-execution.ts'

const snapshot = {
  stopStatusById: { 'stop-a': 'arrived' },
  stopStatusBySequence: { 2: 'completed' },
}

assert.equal(stopExecutionDone(snapshot, { id: 'stop-a', stopOrder: 1 }), true)
assert.equal(stopExecutionDone(snapshot, { id: 'stop-b', stopOrder: 2 }), true)
assert.equal(stopExecutionDone(snapshot, { id: 'stop-c', stopOrder: 3 }), false)
assert.equal(stopExecutionDone(null, { id: 'stop-a', stopOrder: 1 }), false)

console.log('job-execution.unit.mjs: PASS')
