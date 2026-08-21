/**
 * TD-010 / F-18 — Command-authoritative job execution merge + legacy-write guards.
 * Run: node scripts/job-execution-bridge.unit.mjs
 */
import assert from 'node:assert/strict'

function mergeStopsWithCommandExecution(stops, snapshot) {
  if (!snapshot || !Array.isArray(stops)) return stops
  return stops.map((stop) => {
    const fromId = snapshot.stopStatusById?.[stop.id]
    const seq = stop.stopOrder ?? stop.sequence
    const fromSeq = seq != null ? snapshot.stopStatusBySequence?.[seq] : null
    const next = fromId ?? fromSeq
    return next ? { ...stop, status: next } : stop
  })
}

function shouldSkipLegacyExecutionEvents(commandResult) {
  return commandResult?.authoritative && commandResult.ok && !commandResult.queued
}

function shouldWriteLegacyExecutionCache(commandResult, authoritative = true) {
  if (!authoritative) return true
  return Boolean(commandResult?.queued)
}

function jobStatusFromExecutionSnapshot(snapshot, status) {
  if (!snapshot) return status
  if (snapshot.completedAt) return 'completed'
  if (snapshot.startedAt) return 'in_progress'
  return status
}

async function enrichJobRowsWithExecution(rows, fetchSnapshot) {
  if (!Array.isArray(rows) || rows.length === 0) return rows

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const snapshot = await fetchSnapshot(String(row.job_id ?? row.id ?? ''))
      if (!snapshot) return row

      const assignment = row._assignment ?? {}
      return {
        ...row,
        status: jobStatusFromExecutionSnapshot(snapshot, row.status),
        _assignment: {
          ...assignment,
          accepted_at: assignment.accepted_at ?? snapshot.acceptedAt ?? null,
          started_at: assignment.started_at ?? snapshot.startedAt ?? null,
        },
      }
    }),
  )

  return enriched
}

const stops = [
  { id: 's1', stopOrder: 1, status: 'planned' },
  { id: 's2', stopOrder: 2, status: 'planned' },
]

const merged = mergeStopsWithCommandExecution(stops, {
  stopStatusById: { s1: 'arrived' },
  stopStatusBySequence: { 2: 'completed' },
})

assert.equal(merged[0].status, 'arrived')
assert.equal(merged[1].status, 'completed')
assert.deepEqual(mergeStopsWithCommandExecution(stops, null), stops)

assert.equal(shouldSkipLegacyExecutionEvents({ authoritative: true, ok: true, queued: false }), true)
assert.equal(shouldSkipLegacyExecutionEvents({ authoritative: true, ok: true, queued: true }), false)
assert.equal(shouldSkipLegacyExecutionEvents({ authoritative: false, ok: true }), false)

assert.equal(shouldWriteLegacyExecutionCache({ queued: false }, true), false)
assert.equal(shouldWriteLegacyExecutionCache({ queued: true }, true), true)
assert.equal(shouldWriteLegacyExecutionCache({ ok: true }, false), true)

assert.equal(jobStatusFromExecutionSnapshot({ startedAt: 't' }, 'assigned'), 'in_progress')
assert.equal(jobStatusFromExecutionSnapshot({ completedAt: 't', startedAt: 't' }, 'in_progress'), 'completed')

const rows = [{ job_id: 'j1', status: 'assigned', _assignment: {} }]
const enriched = await enrichJobRowsWithExecution(rows, async (id) =>
  id === 'j1' ? { acceptedAt: 'a', startedAt: 's' } : null,
)
assert.equal(enriched[0].status, 'in_progress')
assert.equal(enriched[0]._assignment.accepted_at, 'a')
assert.equal(enriched[0]._assignment.started_at, 's')

console.log('job-execution-bridge.unit.mjs: PASS')
